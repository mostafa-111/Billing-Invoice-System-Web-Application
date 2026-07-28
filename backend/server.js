const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const config = require('config');
const { logger, requestLogger, errorLogger } = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');
const swaggerSpec = require('./docs/swagger');

const app = express();

// Middleware
if (config.get('server.env') === 'development') {
  // Allow all origins in development
  app.use(cors({
    origin: true, // Allow all origins
    credentials: true
  }));
} else {
  app.use(cors(config.get('cors')));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Ignore Chrome DevTools well-known requests (harmless 404s)
app.use((req, res, next) => {
  if (req.path.includes('/.well-known/')) {
    return res.status(404).end();
  }
  next();
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Invoice Billing System API',
    version: '1.0.0',
    docs: '/api-docs'
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/tax', require('./routes/tax'));
app.use('/api/email', require('./routes/email'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/currency', require('./routes/currency'));
app.use('/api/discount-codes', require('./routes/discountCodes'));
// Temporarily disabled new routes for testing
// app.use('/api/ai', require('./routes/ai'));
// app.use('/api/tax', require('./routes/tax'));
// app.use('/api/email', require('./routes/email'));
// app.use('/api/recurring', require('./routes/recurring'));
// app.use('/api/payment', require('./routes/payment'));
// app.use('/api/currency', require('./routes/currency'));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || config.get('database.uri');

if (!MONGO_URI) {
  logger.error('ERROR: Database URI not configured!');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    logger.info('✅ Connected to MongoDB');

    // Initialize default admin user if not exists or password is wrong
    try {
      const User = require('./models/User');
      let admin = await User.findOne({ email: 'admin@invoiceapp.com' });

      if (!admin) {
        // Create new admin user
        admin = await User.create({
          name: 'Admin User',
          email: 'admin@invoiceapp.com',
          password: 'admin123', // Plain password - let the pre-save middleware hash it
          role: 'admin'
        });
        logger.info('✅ Default admin user created: admin@invoiceapp.com / admin123');
      } else {
        // Check if password is correct
        const passwordValid = await admin.comparePassword('admin123');
        if (!passwordValid) {
          logger.info('🔧 Admin password incorrect, resetting...');
          admin.password = 'admin123'; // This will be hashed by pre-save middleware
          await admin.save();
          logger.info('✅ Admin password reset');
        } else {
          logger.info('✅ Admin user exists and password is correct');
        }
      }
    } catch (err) {
      logger.error('❌ Error creating/checking admin user:', err);
    }
  })
  .catch(err => {
    logger.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Error logging middleware
app.use(errorLogger);

// Global error handler
app.use(errorHandler);

// 404 handler
app.use(notFoundHandler);

const PORT = config.get('server.port');

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT} in ${config.get('server.env')} mode`);
  logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
});

