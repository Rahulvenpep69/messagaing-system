# Ticketing System

A comprehensive support ticket management system built with React, Node.js, Express, and MongoDB. Features role-based authentication, real-time email integration, and a modern responsive UI.

## 🚀 Features

### Core Functionality
- **Multi-Role Authentication**: Super Admin, Agent, and End User roles with JWT-based authentication
- **Ticket Management**: Complete CRUD operations with unique serial numbers (TKT-0001, TKT-0002, etc.)
- **Real-time Email Integration**: Automatic ticket creation from incoming emails via IMAP
- **Conversation Threading**: Messages between customers and agents with internal notes support
- **Status Tracking**: Open → In Progress → Resolved → Closed workflow
- **Priority System**: Low, Medium, High, Urgent priority levels
- **Assignment System**: Assign tickets to specific agents (Super Admin feature)

### User Roles & Permissions

#### Super Admin
- View and manage all tickets
- Assign/reassign tickets to agents
- Manage users (create, edit, deactivate)
- Access to admin dashboard and analytics
- View internal notes and system-wide statistics

#### Agent
- View tickets assigned to them
- Update ticket status and add responses
- Add internal notes for coordination
- Cannot reassign tickets to other agents

#### End User (Customer)
- Create new support tickets
- View their own tickets only
- Add messages to their tickets
- Track ticket status and updates

### Technical Features
- **Modern React Frontend**: Built with React 18, React Router, and TailwindCSS
- **Robust Backend API**: Express.js with proper MVC architecture
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with secure password hashing
- **Input Validation**: Joi validation on backend, React Hook Form on frontend
- **Error Handling**: Comprehensive error handling and user feedback
- **Logging**: Winston-based logging system
- **Email Integration**: IMAP listener for automatic ticket creation
- **Responsive Design**: Mobile-first responsive UI

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Ticketing
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Configuration**
   
   Copy the environment template:
   ```bash
   cp backend/.env.example backend/.env
   ```
   
   Update `backend/.env` with your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/ticketing_system
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   
   # Server
   PORT=5000
   NODE_ENV=development
   
   # Email Configuration (Optional)
   EMAIL_HOST=imap.gmail.com
   EMAIL_PORT=993
   EMAIL_USER=support@yourcompany.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_TLS=true
   
   # Frontend URL
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system.

5. **Seed the database**
   ```bash
   npm run seed
   ```
   
   This creates demo users and sample tickets.

6. **Start the application**
   ```bash
   npm run dev
   ```
   
   This starts both backend (port 5000) and frontend (port 3000) concurrently.

7. **Access the application**
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔐 Demo Accounts

After running the seed script, you can use these demo accounts:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Super Admin | admin@demo.com | admin123 | Full system access |
| Agent | agent@demo.com | agent123 | Handle assigned tickets |
| Agent | agent2@demo.com | agent123 | Additional agent account |
| Customer | user@demo.com | user123 | End user account |
| Customer | alice@demo.com | user123 | Additional customer |
| Customer | bob@demo.com | user123 | Additional customer |

## 📧 Email Integration Setup

The system can automatically create tickets from incoming emails. To set this up:

1. **Configure Email Settings**
   
   Update your `.env` file with IMAP settings:
   ```env
   EMAIL_HOST=imap.gmail.com
   EMAIL_PORT=993
   EMAIL_USER=support@yourcompany.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_TLS=true
   ```

2. **Gmail Setup** (if using Gmail)
   - Enable 2-factor authentication
   - Generate an app-specific password
   - Use the app password in EMAIL_PASSWORD

3. **Features**
   - Automatic ticket creation from emails
   - Reply detection (emails with ticket numbers in subject)
   - Smart priority and category detection
   - User auto-creation for new email addresses

## 🏗️ Project Structure

```
Ticketing/
├── backend/                 # Node.js/Express backend
│   ├── middleware/         # Authentication & error handling
│   ├── models/            # MongoDB models (User, Ticket)
│   ├── routes/            # API routes (auth, users, tickets)
│   ├── services/          # Email listener service
│   ├── scripts/           # Database seeding
│   ├── utils/             # Utilities (logging)
│   ├── validation/        # Joi validation schemas
│   └── server.js          # Main server file
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── auth/      # Login/Register components
│   │   │   ├── admin/     # Admin-only components
│   │   │   ├── common/    # Shared components
│   │   │   ├── dashboard/ # Dashboard components
│   │   │   ├── layout/    # Layout components (Navbar)
│   │   │   └── tickets/   # Ticket-related components
│   │   ├── contexts/      # React contexts (Auth)
│   │   └── index.js       # App entry point
│   └── public/            # Static assets
└── package.json           # Root package.json
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Users (Super Admin only)
- `GET /api/users` - Get all users (with pagination)
- `GET /api/users/agents` - Get all agents
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `GET /api/users/stats/overview` - User statistics

### Tickets
- `GET /api/tickets` - Get tickets (role-based filtering)
- `GET /api/tickets/:id` - Get single ticket
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/messages` - Add message to ticket
- `POST /api/tickets/:id/assign` - Assign ticket (Super Admin)
- `GET /api/tickets/stats/overview` - Ticket statistics

## 🎨 UI Components

### Key Features
- **Responsive Design**: Mobile-first approach with TailwindCSS
- **Role-based Navigation**: Different navigation items based on user role
- **Real-time Updates**: React Query for efficient data fetching and caching
- **Form Validation**: Client-side validation with React Hook Form
- **Toast Notifications**: User-friendly feedback for all actions
- **Loading States**: Proper loading indicators throughout the app
- **Error Handling**: Graceful error handling with user-friendly messages

### Pages
- **Login/Register**: Authentication pages with validation
- **Dashboard**: Role-specific dashboard with statistics
- **Ticket List**: Filterable and searchable ticket list with pagination
- **Ticket Detail**: Comprehensive ticket view with conversation thread
- **Create Ticket**: User-friendly ticket creation form
- **User Management**: Admin interface for managing users (Super Admin only)

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Role-based Access Control**: Proper permission checking
- **Input Validation**: Server-side validation with Joi
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Configuration**: Secure cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers

## 📊 Monitoring & Logging

- **Winston Logging**: Comprehensive logging system
- **Error Tracking**: Detailed error logging and handling
- **Request Logging**: Morgan for HTTP request logging
- **Health Check**: `/api/health` endpoint for monitoring

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-secret
FRONTEND_URL=https://yourapp.com
```

### Build for Production

```bash
# Build frontend
cd frontend
npm run build

# Start backend in production mode
cd ../backend
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Email Integration Not Working**
   - Verify IMAP settings
   - Check firewall settings
   - For Gmail, use app-specific passwords

3. **Frontend Build Issues**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

### Getting Help

- Check the console for error messages
- Review the logs in `backend/logs/`
- Ensure all environment variables are set correctly

## ✨ Future Enhancements

- WhatsApp integration for ticket creation
- File attachment support
- Advanced reporting and analytics
- WebSocket integration for real-time updates
- Mobile app development
- Multi-language support
- Advanced search capabilities
- SLA tracking and notifications
# messagaing-system  
