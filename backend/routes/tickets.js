const express = require('express');
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { createTicketSchema, updateTicketSchema, addMessageSchema } = require('../validation/schemas');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const webhookService = require('../services/webhookService');


const router = express.Router();

// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      category, 
      assignedAgent, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = {};
    
    // Role-based filtering
    if (req.user.role === 'end_user') {
      query.customer = req.user.id;
    } else if (req.user.role === 'agent') {
      query.assignedAgent = req.user.id;
    }
    // Super admin can see all tickets (no additional filter)

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (assignedAgent && req.user.role === 'super_admin') {
      query.assignedAgent = assignedAgent;
    }
    
    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tickets = await Ticket.find(query)
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .populate('messages.sender', 'name email role')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort(sortOptions);

    // Filter messages based on user role
    const filteredTickets = tickets.map(ticket => {
      const ticketObj = ticket.toObject();
      if (req.user.role === 'end_user') {
        // End users can only see public messages
        ticketObj.messages = ticket.getPublicMessages();
      }
      return ticketObj;
    });

    const total = await Ticket.countDocuments(query);

    res.json({
      success: true,
      data: filteredTickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .populate('messages.sender', 'name email role');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check access permissions
    if (req.user.role === 'end_user' && ticket.customer._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (req.user.role === 'agent' && 
        ticket.assignedAgent && 
        ticket.assignedAgent._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const ticketObj = ticket.toObject();
    
    // Filter messages for end users
    if (req.user.role === 'end_user') {
      ticketObj.messages = ticket.getPublicMessages();
    }

    res.json({
      success: true,
      data: ticketObj
    });
  } catch (error) {
    logger.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create new ticket
// @route   POST /api/tickets
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { error, value } = createTicketSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      });
    }

    // Try to generate a unique ticket number with a few retries to avoid race conditions
    let ticket;
    let lastError;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const ticketNumber = await Ticket.generateTicketNumber();
        ticket = await Ticket.create({
          ...value,
          ticketNumber,
          customer: req.user.id,
          source: 'web'
        });
        break; // success
      } catch (err) {
        lastError = err;
        // Duplicate key for ticketNumber: try again
        if (err && err.code === 11000) {
          continue;
        }
        throw err;
      }
    }

    if (!ticket) {
      logger.error('Create ticket error after retries:', lastError);
      return res.status(500).json({ message: 'Could not allocate unique ticket number' });
    }

    // Add initial message
    await ticket.addMessage(req.user.id, value.description);

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('customer', 'name email')
      .populate('messages.sender', 'name email role');

    logger.info(`Ticket created: ${ticket.ticketNumber} by ${req.user.email}`);

    // Trigger webhook
    webhookService.trigger('ticket.created', populatedTicket);

    res.status(201).json({

      success: true,
      data: populatedTicket
    });
  } catch (error) {
    logger.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update ticket
// @route   PUT /api/tickets/:id
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    // Sanitize payload: remove empty-string fields, normalize tags
    const sanitized = { ...req.body };
    Object.keys(sanitized).forEach((k) => {
      if (sanitized[k] === '') {
        // Drop empty strings to avoid validation errors
        delete sanitized[k];
      }
    });
    if (typeof sanitized.tags === 'string') {
      const tags = sanitized.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) sanitized.tags = tags; else delete sanitized.tags;
    }

    let { error, value } = updateTicketSchema.validate(sanitized);
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check permissions
    if (req.user.role === 'end_user') {
      // End users can only update their own tickets and limited fields
      if (ticket.customer.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      // End users can only update subject and description, and only if ticket is open
      if (ticket.status !== 'open') {
        return res.status(400).json({ message: 'Cannot update ticket that is not open' });
      }
      const allowedFields = ['subject', 'description'];
      const updateData = {};
      allowedFields.forEach(field => {
        if (value[field] !== undefined) updateData[field] = value[field];
      });
      value = updateData;
    } else if (req.user.role === 'agent') {
      // Agents can update tickets assigned to them
      if (ticket.assignedAgent && ticket.assignedAgent.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      // Agents cannot assign tickets to other agents
      if (value.assignedAgent && value.assignedAgent !== req.user.id) {
        delete value.assignedAgent;
      }
    }
    // Super admin can update any field

    // Validate assigned agent if provided
    if (value.assignedAgent) {
      const agent = await User.findById(value.assignedAgent);
      if (!agent || agent.role !== 'agent' || !agent.isActive) {
        return res.status(400).json({ message: 'Invalid agent assignment' });
      }
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    )
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .populate('messages.sender', 'name email role');

    logger.info(`Ticket updated: ${updatedTicket.ticketNumber} by ${req.user.email}`);

    // Trigger webhook
    webhookService.trigger('ticket.updated', updatedTicket);

    res.json({

      success: true,
      data: updatedTicket
    });
  } catch (error) {
    logger.error('Update ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Add message to ticket
// @route   POST /api/tickets/:id/messages
// @access  Private
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { error, value } = addMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check permissions
    if (req.user.role === 'end_user' && ticket.customer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    if (req.user.role === 'agent' && 
        ticket.assignedAgent && 
        ticket.assignedAgent.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // End users cannot send internal messages
    if (req.user.role === 'end_user' && value.isInternal) {
      value.isInternal = false;
    }

    await ticket.addMessage(req.user.id, value.message, value.isInternal);

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email')
      .populate('messages.sender', 'name email role');

    logger.info(`Message added to ticket: ${ticket.ticketNumber} by ${req.user.email}`);

    // Trigger webhook
    webhookService.trigger('message.added', {
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket._id,
      message: value.message,
      isInternal: value.isInternal,
      sender: req.user.name
    });

    res.json({

      success: true,
      data: updatedTicket
    });
  } catch (error) {
    logger.error('Add message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Assign ticket to agent
// @route   POST /api/tickets/:id/assign
// @access  Private (Super Admin only)
router.post('/:id/assign', auth, authorize('super_admin'), async (req, res) => {
  try {
    const { agentId } = req.body;

    if (!agentId) {
      return res.status(400).json({ message: 'Agent ID is required' });
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent' || !agent.isActive) {
      return res.status(400).json({ message: 'Invalid agent' });
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { assignedAgent: agentId },
      { new: true }
    )
      .populate('customer', 'name email')
      .populate('assignedAgent', 'name email');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    logger.info(`Ticket ${ticket.ticketNumber} assigned to ${agent.email} by ${req.user.email}`);

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    logger.error('Assign ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get ticket statistics
// @route   GET /api/tickets/stats/overview
// @access  Private
router.get('/stats/overview', auth, async (req, res) => {
  try {
    let matchQuery = {};
    
    // Role-based filtering for stats
    if (req.user.role === 'end_user') {
      matchQuery.customer = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === 'agent') {
      matchQuery.assignedAgent = new mongoose.Types.ObjectId(req.user.id);
    }

    const stats = await Ticket.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
          urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, urgent: 0, high: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Get ticket stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
