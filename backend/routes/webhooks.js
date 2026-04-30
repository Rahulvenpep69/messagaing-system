const express = require('express');
const Webhook = require('../models/Webhook');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const { createWebhookSchema } = require('../validation/schemas');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();

// --- Outgoing Webhooks CRUD (Super Admin only) ---

// @desc    Get all webhooks
// @route   GET /api/webhooks
// @access  Private (Super Admin)
router.get('/', auth, authorize('super_admin'), async (req, res) => {
  try {
    const webhooks = await Webhook.find().populate('createdBy', 'name email');
    res.json({ success: true, data: webhooks });
  } catch (error) {
    logger.error('Get webhooks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Create a new webhook
// @route   POST /api/webhooks
// @access  Private (Super Admin)
router.post('/', auth, authorize('super_admin'), async (req, res) => {
  try {
    const { error, value } = createWebhookSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: 'Validation error', details: error.details[0].message });
    }

    const webhook = await Webhook.create({
      ...value,
      createdBy: req.user.id
    });

    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    logger.error('Create webhook error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete a webhook
// @route   DELETE /api/webhooks/:id
// @access  Private (Super Admin)
router.delete('/:id', auth, authorize('super_admin'), async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);
    if (!webhook) {
      return res.status(404).json({ message: 'Webhook not found' });
    }
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (error) {
    logger.error('Delete webhook error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Incoming Webhook (Public or with Secret) ---

// @desc    Incoming webhook to receive information (e.g., create a ticket)
// @route   POST /api/webhooks/incoming
// @access  Public (Secret verification recommended)
router.post('/incoming', async (req, res) => {
  try {
    const { subject, description, customerEmail, secret } = req.body;

    // Simple secret verification if configured in .env (optional)
    if (process.env.INCOMING_WEBHOOK_SECRET && secret !== process.env.INCOMING_WEBHOOK_SECRET) {
      return res.status(401).json({ message: 'Invalid secret' });
    }

    if (!subject || !description || !customerEmail) {
      return res.status(400).json({ message: 'Missing required fields: subject, description, customerEmail' });
    }

    // Find or create customer
    let customer = await User.findOne({ email: customerEmail });
    if (!customer) {
      // Auto-register user if doesn't exist
      customer = await User.create({
        name: customerEmail.split('@')[0],
        email: customerEmail,
        password: crypto.randomBytes(12).toString('hex'), // Random password
        role: 'end_user'
      });
      logger.info(`Auto-registered user via incoming webhook: ${customerEmail}`);
    }

    // Generate ticket number
    const ticketNumber = await Ticket.generateTicketNumber();
    
    // Create ticket
    const ticket = await Ticket.create({
      subject,
      description,
      customer: customer._id,
      ticketNumber,
      source: 'webhook'
    });

    // Add initial message
    await ticket.addMessage(customer._id, description);

    logger.info(`Ticket created via incoming webhook: ${ticket.ticketNumber}`);

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      data: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status
      }
    });
  } catch (error) {
    logger.error('Incoming webhook error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
