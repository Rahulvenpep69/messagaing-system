const Imap = require('imap');
const { simpleParser } = require('mailparser');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const logger = require('../utils/logger');

class EmailListener {
  constructor() {
    this.imap = null;
    this.isConnected = false;
    this.config = {
      user: process.env.EMAIL_USER,
      password: process.env.EMAIL_PASSWORD,
      host: process.env.EMAIL_HOST || 'imap.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 993,
      tls: process.env.EMAIL_TLS === 'true',
      tlsOptions: { rejectUnauthorized: false }
    };
  }

  start() {
    if (!this.config.user || !this.config.password) {
      logger.warn('Email credentials not configured. Email listener will not start.');
      return;
    }

    try {
      this.imap = new Imap(this.config);
      this.setupEventHandlers();
      this.imap.connect();
      logger.info('Email listener starting...');
    } catch (error) {
      logger.error('Failed to start email listener:', error);
    }
  }

  stop() {
    if (this.imap && this.isConnected) {
      this.imap.end();
      logger.info('Email listener stopped');
    }
  }

  setupEventHandlers() {
    this.imap.once('ready', () => {
      logger.info('Email listener connected and ready');
      this.isConnected = true;
      this.openInbox();
    });

    this.imap.once('error', (err) => {
      logger.error('IMAP connection error:', err);
      this.isConnected = false;
      // Attempt to reconnect after 30 seconds
      setTimeout(() => {
        if (!this.isConnected) {
          logger.info('Attempting to reconnect email listener...');
          this.start();
        }
      }, 30000);
    });

    this.imap.once('end', () => {
      logger.info('IMAP connection ended');
      this.isConnected = false;
    });
  }

  openInbox() {
    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        logger.error('Failed to open inbox:', err);
        return;
      }

      logger.info('Inbox opened, monitoring for new emails');
      
      // Listen for new emails
      this.imap.on('mail', (numNewMsgs) => {
        logger.info(`${numNewMsgs} new email(s) received`);
        this.fetchNewEmails();
      });

      // Process any existing unread emails
      this.fetchNewEmails();
    });
  }

  fetchNewEmails() {
    // Search for unread emails
    this.imap.search(['UNSEEN'], (err, results) => {
      if (err) {
        logger.error('Email search error:', err);
        return;
      }

      if (!results || results.length === 0) {
        return;
      }

      logger.info(`Processing ${results.length} unread email(s)`);

      const fetch = this.imap.fetch(results, {
        bodies: '',
        markSeen: true,
        struct: true
      });

      fetch.on('message', (msg, seqno) => {
        this.processMessage(msg, seqno);
      });

      fetch.once('error', (err) => {
        logger.error('Fetch error:', err);
      });

      fetch.once('end', () => {
        logger.info('Finished processing emails');
      });
    });
  }

  processMessage(msg, seqno) {
    let emailData = {};
    
    msg.on('body', (stream, info) => {
      let buffer = '';
      
      stream.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
      });
      
      stream.once('end', async () => {
        try {
          const parsed = await simpleParser(buffer);
          emailData = {
            messageId: parsed.messageId,
            from: parsed.from?.value?.[0] || {},
            to: parsed.to?.value?.[0] || {},
            subject: parsed.subject || 'No Subject',
            text: parsed.text || '',
            html: parsed.html || '',
            date: parsed.date || new Date()
          };
          
          logger.info(`Processing email from: ${emailData.from.address}, subject: ${emailData.subject}`);
          
          await this.createTicketFromEmail(emailData);
        } catch (error) {
          logger.error('Email parsing error:', error);
        }
      });
    });

    msg.once('attributes', (attrs) => {
      emailData.uid = attrs.uid;
    });
  }

  async createTicketFromEmail(emailData) {
    try {
      const fromEmail = emailData.from.address?.toLowerCase();
      const fromName = emailData.from.name || fromEmail;

      if (!fromEmail) {
        logger.warn('Email has no sender address, skipping');
        return;
      }

      // Check if this is a reply to an existing ticket
      const existingTicket = await this.findExistingTicket(emailData);
      if (existingTicket) {
        await this.addReplyToExistingTicket(existingTicket, emailData);
        return;
      }

      // Find or create user
      let user = await User.findOne({ email: fromEmail });
      if (!user) {
        user = await User.create({
          name: fromName,
          email: fromEmail,
          password: 'temp123456', // Temporary password
          role: 'end_user'
        });
        logger.info(`Created new user from email: ${fromEmail}`);
      }

      // Extract ticket content
      const description = this.extractEmailContent(emailData);
      const priority = this.detectPriority(emailData.subject, description);
      const category = this.detectCategory(emailData.subject, description);

      // Generate ticket number
      const ticketNumber = await Ticket.generateTicketNumber();

      // Create ticket
      const ticket = await Ticket.create({
        ticketNumber,
        subject: emailData.subject,
        description: description,
        customer: user._id,
        priority,
        category,
        source: 'email',
        emailData: {
          messageId: emailData.messageId,
          fromEmail: fromEmail,
          subject: emailData.subject
        }
      });

      // Add initial message
      await ticket.addMessage(user._id, description);

      logger.info(`Created ticket ${ticketNumber} from email: ${fromEmail}`);

      // TODO: Send confirmation email to user
      await this.sendConfirmationEmail(user, ticket);

    } catch (error) {
      logger.error('Error creating ticket from email:', error);
    }
  }

  async findExistingTicket(emailData) {
    // Look for ticket number in subject line (e.g., "Re: [TKT-0001]")
    const ticketNumberMatch = emailData.subject.match(/\[?(TKT-\d+)\]?/i);
    if (ticketNumberMatch) {
      const ticketNumber = ticketNumberMatch[1].toUpperCase();
      return await Ticket.findOne({ ticketNumber });
    }

    // Look for ticket with same message ID thread
    if (emailData.messageId) {
      return await Ticket.findOne({ 
        'emailData.messageId': emailData.messageId 
      });
    }

    return null;
  }

  async addReplyToExistingTicket(ticket, emailData) {
    try {
      const fromEmail = emailData.from.address?.toLowerCase();
      const user = await User.findOne({ email: fromEmail });
      
      if (!user) {
        logger.warn(`User not found for email reply: ${fromEmail}`);
        return;
      }

      const message = this.extractEmailContent(emailData);
      await ticket.addMessage(user._id, message);

      // Reopen ticket if it was closed and customer is replying
      if ((ticket.status === 'resolved' || ticket.status === 'closed') && 
          user._id.toString() === ticket.customer.toString()) {
        ticket.status = 'open';
        await ticket.save();
      }

      logger.info(`Added reply to ticket ${ticket.ticketNumber} from ${fromEmail}`);
    } catch (error) {
      logger.error('Error adding reply to ticket:', error);
    }
  }

  extractEmailContent(emailData) {
    // Prefer plain text, fall back to HTML
    let content = emailData.text || '';
    
    if (!content && emailData.html) {
      // Basic HTML to text conversion
      content = emailData.html
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
    }

    // Remove email signatures and quoted text
    const lines = content.split('\n');
    const cleanLines = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Stop at common reply indicators
      if (trimmedLine.startsWith('On ') && trimmedLine.includes('wrote:')) break;
      if (trimmedLine.startsWith('From:') && trimmedLine.includes('@')) break;
      if (trimmedLine.startsWith('-----Original Message-----')) break;
      if (trimmedLine.startsWith('> ')) break; // Quoted text
      
      cleanLines.push(line);
    }

    return cleanLines.join('\n').trim() || 'No content available';
  }

  detectPriority(subject, content) {
    const urgentKeywords = ['urgent', 'emergency', 'critical', 'asap', 'immediately'];
    const highKeywords = ['important', 'priority', 'serious', 'problem'];
    
    const text = (subject + ' ' + content).toLowerCase();
    
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
      return 'urgent';
    }
    
    if (highKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }
    
    return 'medium';
  }

  detectCategory(subject, content) {
    const text = (subject + ' ' + content).toLowerCase();
    
    if (text.includes('bill') || text.includes('payment') || text.includes('invoice')) {
      return 'billing';
    }
    
    if (text.includes('bug') || text.includes('error') || text.includes('not working')) {
      return 'technical';
    }
    
    if (text.includes('complaint') || text.includes('dissatisfied') || text.includes('angry')) {
      return 'complaint';
    }
    
    return 'general';
  }

  async sendConfirmationEmail(user, ticket) {
    // TODO: Implement email sending
    // This would typically use nodemailer or similar service
    logger.info(`Should send confirmation email to ${user.email} for ticket ${ticket.ticketNumber}`);
  }
}

// Create singleton instance
const emailListener = new EmailListener();

module.exports = emailListener;
