const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name for the webhook'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  url: {
    type: String,
    required: [true, 'Please add a target URL'],
    match: [
      /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
      'Please add a valid URL'
    ]
  },
  events: {
    type: [String],
    enum: ['ticket.created', 'ticket.updated', 'ticket.deleted', 'message.added'],
    default: ['ticket.created']
  },
  secret: {
    type: String,
    required: [true, 'Please add a secret for verification'],
    default: () => require('crypto').randomBytes(20).toString('hex')
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Webhook', webhookSchema);
