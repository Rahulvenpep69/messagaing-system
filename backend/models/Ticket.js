const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isInternal: {
    type: Boolean,
    default: false // Internal notes between agents/admins
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Please add a subject'],
    trim: true,
    maxlength: [200, 'Subject cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'general', 'complaint'],
    default: 'general'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  messages: [messageSchema],
  tags: [{
    type: String,
    trim: true
  }],
  source: {
    type: String,
    enum: ['web', 'email', 'whatsapp', 'webhook'],
    default: 'web'
  },
  emailData: {
    messageId: String,
    fromEmail: String,
    subject: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  },
  closedAt: {
    type: Date
  }
});

// Update the updatedAt field before saving
ticketSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set resolvedAt when status changes to resolved
  if (this.isModified('status') && this.status === 'resolved' && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  
  // Set closedAt when status changes to closed
  if (this.isModified('status') && this.status === 'closed' && !this.closedAt) {
    this.closedAt = new Date();
  }
  
  next();
});

// Static method to generate ticket number using atomic counter
ticketSchema.statics.generateTicketNumber = async function() {
  const Counter = require('./Counter');
  const result = await Counter.findOneAndUpdate(
    { key: 'ticket' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const nextNumber = result.seq;
  return `TKT-${nextNumber.toString().padStart(4, '0')}`;
};

// Add message to ticket
ticketSchema.methods.addMessage = function(senderId, message, isInternal = false) {
  this.messages.push({
    sender: senderId,
    message,
    isInternal
  });
  return this.save();
};

// Get public messages (excluding internal notes)
ticketSchema.methods.getPublicMessages = function() {
  return this.messages.filter(msg => !msg.isInternal);
};

module.exports = mongoose.model('Ticket', ticketSchema);
