const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('super_admin', 'agent', 'end_user').default('end_user')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const createTicketSchema = Joi.object({
  subject: Joi.string().trim().min(5).max(200).required(),
  description: Joi.string().trim().min(10).max(2000).required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  category: Joi.string().valid('technical', 'billing', 'general', 'complaint').default('general'),
  tags: Joi.array().items(Joi.string().trim()).optional()
});

const updateTicketSchema = Joi.object({
  subject: Joi.string().trim().min(5).max(200).optional(),
  description: Joi.string().trim().min(10).max(2000).optional(),
  status: Joi.string().valid('open', 'in-progress', 'resolved', 'closed').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  category: Joi.string().valid('technical', 'billing', 'general', 'complaint').optional(),
  assignedAgent: Joi.string().optional().allow(null),
  tags: Joi.array().items(Joi.string().trim()).optional()
});

const addMessageSchema = Joi.object({
  message: Joi.string().trim().min(1).max(2000).required(),
  isInternal: Joi.boolean().default(false)
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('super_admin', 'agent', 'end_user').optional(),
  isActive: Joi.boolean().optional()
});

const createWebhookSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  url: Joi.string().uri().required(),
  events: Joi.array().items(Joi.string().valid('ticket.created', 'ticket.updated', 'ticket.deleted', 'message.added')).min(1).required(),
  isActive: Joi.boolean().default(true)
});


module.exports = {
  registerSchema,
  loginSchema,
  createTicketSchema,
  updateTicketSchema,
  addMessageSchema,
  updateUserSchema,
  createWebhookSchema
};

