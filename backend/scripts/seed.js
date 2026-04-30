const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Ticket = require('../models/Ticket');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketing_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB for seeding');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const clearDatabase = async () => {
  try {
    await User.deleteMany({});
    await Ticket.deleteMany({});
    logger.info('Database cleared');
  } catch (error) {
    logger.error('Error clearing database:', error);
    throw error;
  }
};

const createUsers = async () => {
  try {
    const users = [
      {
        name: 'Super Admin',
        email: 'admin@demo.com',
        password: 'admin123',
        role: 'super_admin',
        isActive: true
      },
      {
        name: 'John Agent',
        email: 'agent@demo.com',
        password: 'agent123',
        role: 'agent',
        isActive: true
      },
      {
        name: 'Jane Smith',
        email: 'agent2@demo.com',
        password: 'agent123',
        role: 'agent',
        isActive: true
      },
      {
        name: 'Demo User',
        email: 'user@demo.com',
        password: 'user123',
        role: 'end_user',
        isActive: true
      },
      {
        name: 'Alice Johnson',
        email: 'alice@demo.com',
        password: 'user123',
        role: 'end_user',
        isActive: true
      },
      {
        name: 'Bob Wilson',
        email: 'bob@demo.com',
        password: 'user123',
        role: 'end_user',
        isActive: true
      }
    ];

    // Hash passwords
    for (const user of users) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }

    const createdUsers = await User.insertMany(users);
    logger.info(`Created ${createdUsers.length} users`);
    return createdUsers;
  } catch (error) {
    logger.error('Error creating users:', error);
    throw error;
  }
};

const createSampleTickets = async (users) => {
  try {
    const superAdmin = users.find(u => u.role === 'super_admin');
    const agents = users.filter(u => u.role === 'agent');
    const endUsers = users.filter(u => u.role === 'end_user');

    const tickets = [
      {
        subject: 'Unable to login to my account',
        description: 'I am unable to login to my account. It says invalid credentials but I am sure my password is correct. I have tried resetting it but haven\'t received any email.',
        priority: 'high',
        category: 'technical',
        customer: endUsers[0]._id,
        assignedAgent: agents[0]._id,
        status: 'in-progress',
        source: 'web',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        subject: 'Billing inquiry about my last invoice',
        description: 'I have a question about my last invoice. There seems to be a charge that I don\'t recognize. Can someone please review this and explain what the charge is for?',
        priority: 'medium',
        category: 'billing',
        customer: endUsers[1]._id,
        assignedAgent: agents[1]._id,
        status: 'open',
        source: 'web',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        subject: 'Feature request: Dark mode support',
        description: 'Would it be possible to add dark mode support to the application? Many users have been requesting this feature and it would greatly improve the user experience, especially for those working in low-light environments.',
        priority: 'low',
        category: 'general',
        customer: endUsers[2]._id,
        assignedAgent: agents[0]._id,
        status: 'resolved',
        source: 'web',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        subject: 'App crashes when uploading large files',
        description: 'The application crashes consistently when I try to upload files larger than 50MB. This is blocking my work as I need to upload design files that are typically 100-200MB. Error message: "Out of memory exception".',
        priority: 'urgent',
        category: 'technical',
        customer: endUsers[0]._id,
        assignedAgent: agents[1]._id,
        status: 'open',
        source: 'web',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        subject: 'Password reset email not received',
        description: 'I requested a password reset but haven\'t received the email. I\'ve checked my spam folder as well. My email is correct in the system.',
        priority: 'medium',
        category: 'technical',
        customer: endUsers[1]._id,
        status: 'open',
        source: 'email',
        emailData: {
          messageId: 'sample-message-id-123',
          fromEmail: 'alice@demo.com',
          subject: 'Password reset email not received'
        },
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        subject: 'Complaint about poor customer service',
        description: 'I am very disappointed with the customer service I received. The agent was rude and unhelpful. This is not the level of service I expect from your company.',
        priority: 'high',
        category: 'complaint',
        customer: endUsers[2]._id,
        status: 'closed',
        source: 'web',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        resolvedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        closedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      }
    ];

    // Generate ticket numbers and create tickets
    const createdTickets = [];
    for (let i = 0; i < tickets.length; i++) {
      const ticketData = tickets[i];
      ticketData.ticketNumber = `TKT-${(i + 1).toString().padStart(4, '0')}`;
      
      const ticket = new Ticket(ticketData);
      await ticket.save();
      
      // Add initial message
      await ticket.addMessage(ticketData.customer, ticketData.description);
      
      // Add some sample conversation for some tickets
      if (i === 0) { // Login issue ticket
        await ticket.addMessage(agents[0]._id, 'Hi! I\'ve checked your account and it seems to be active. Can you please try clearing your browser cache and cookies, then attempt to login again?');
        await ticket.addMessage(ticketData.customer, 'I tried that but still having the same issue. Could you please reset my password manually?');
        await ticket.addMessage(agents[0]._id, 'I\'ve sent you a password reset link to your email. Please check your inbox and spam folder.', false);
      }
      
      if (i === 2) { // Dark mode feature request
        await ticket.addMessage(agents[0]._id, 'Thank you for the feature request! I\'ve forwarded this to our development team for consideration in the next release.');
        await ticket.addMessage(agents[0]._id, 'Update: The development team has approved this feature and it will be included in version 2.1, scheduled for release next month.', false);
        await ticket.addMessage(ticketData.customer, 'That\'s great news! Thank you for the quick response.');
      }
      
      createdTickets.push(ticket);
    }

    logger.info(`Created ${createdTickets.length} sample tickets`);
    return createdTickets;
  } catch (error) {
    logger.error('Error creating sample tickets:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    logger.info('Starting database seeding...');
    
    await connectDB();
    await clearDatabase();
    
    const users = await createUsers();
    await createSampleTickets(users);
    
    logger.info('Database seeding completed successfully!');
    logger.info('\n=== Demo Account Details ===');
    logger.info('Super Admin: admin@demo.com / admin123');
    logger.info('Agent: agent@demo.com / agent123');
    logger.info('Agent 2: agent2@demo.com / agent123');
    logger.info('End User: user@demo.com / user123');
    logger.info('End User 2: alice@demo.com / user123');
    logger.info('End User 3: bob@demo.com / user123');
    logger.info('=============================\n');
    
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
};

// Run the seeding script
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
