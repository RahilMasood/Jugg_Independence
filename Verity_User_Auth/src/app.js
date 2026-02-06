const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const engagementRoutes = require('./routes/engagements');
const confirmationRoutes = require('./routes/confirmation');
const webhookRoutes = require('./routes/webhooks');
const clientRoutes = require('./routes/clients');
const independenceRoutes = require('./routes/independence');
const firmRoutes = require('./routes/firms');

// New admin routes for 3 pages
const adminRoutes = require('./routes/admin');
const clientOnboardingRoutes = require('./routes/clientOnboarding');
const engagementManagementRoutes = require('./routes/engagementManagement');
const engagementsPublicRoutes = require('./routes/engagementsPublic');

// SharePoint config route
const sharepointConfigRoutes = require('./routes/sharepointConfig');
const externalUsersRoutes = require('./routes/externalUsers');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust proxy (required for Railway deployment)
// Railway uses proxies and sets X-Forwarded-For headers
// Use 1 instead of true to trust only the first proxy (safer for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        process.env.CLIENT_PORTAL_URL, 
        process.env.CONFIRMING_PARTY_PORTAL_URL,
        process.env.CLIENT_ONBOARD_URL,  // ClientOnboard service URL
        process.env.INDEPENDENCE_TOOL_URL  // Independence Tool service URL
      ].filter(Boolean) // Remove undefined values
    : '*',
  credentials: true
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      status: 'healthy',
      timestamp: new Date().toISOString()
    } 
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/engagements', engagementRoutes);
app.use('/api/v1/confirmations', confirmationRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/independence', independenceRoutes);
app.use('/api/v1/firms', firmRoutes);
app.use('/api/v1/sharepoint-config', sharepointConfigRoutes);
app.use('/api/v1/external-users', externalUsersRoutes);

// New admin routes for 3 pages
// IMPORTANT: Register routes in order of specificity (most specific first)
// Regular user routes (clientOnboardingRoutes) must come BEFORE admin routes
// to ensure /user/clients uses regular auth, not admin auth
app.use('/api/v1/admin', engagementsPublicRoutes); // Create engagement - no admin required (MUST BE FIRST)
app.use('/api/v1/admin', clientOnboardingRoutes); // Page 2: Client onboarding (user routes must be first)
app.use('/api/v1/admin', adminRoutes); // Page 1: Admin login + User CRUD
app.use('/api/v1/admin', engagementManagementRoutes); // Page 3: Engagement management

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;

