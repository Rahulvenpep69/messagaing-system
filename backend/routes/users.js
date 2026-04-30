const express = require('express');
const User = require('../models/User');
const { updateUserSchema } = require('../validation/schemas');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Super Admin only)
router.get('/', auth, authorize('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get agents
// @route   GET /api/users/agents
// @access  Private (Super Admin and Agent)
router.get('/agents', auth, authorize('super_admin', 'agent'), async (req, res) => {
  try {
    const agents = await User.find({ 
      role: 'agent', 
      isActive: true 
    }).select('_id name email');

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    logger.error('Get agents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Super Admin only)
router.get('/:id', auth, authorize('super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Super Admin only)
router.put('/:id', auth, authorize('super_admin'), async (req, res) => {
  try {
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.details[0].message 
      });
    }

    // Check if email is being updated and if it already exists
    if (value.email) {
      const existingUser = await User.findOne({ 
        email: value.email, 
        _id: { $ne: req.params.id } 
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      value,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(`User updated: ${user.email} by ${req.user.email}`);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Super Admin only)
router.delete('/:id', auth, authorize('super_admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting super admin
    if (user.role === 'super_admin') {
      return res.status(400).json({ message: 'Cannot delete super admin' });
    }

    // Soft delete by deactivating
    user.isActive = false;
    await user.save();

    logger.info(`User deactivated: ${user.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private (Super Admin only)
router.get('/stats/overview', auth, authorize('super_admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const stats = {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      byRole: usersByRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
