const jwt = require('jsonwebtoken');
const config = require('config');
const { UnauthorizedError, ForbiddenError } = require('../utils/errorHandler');
const User = require('../models/User');

const JWT_SECRET = config.get('jwt.secret');

// Verify JWT token
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('Access denied. No token provided.');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      throw new UnauthorizedError('Invalid token. User not found.');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new ForbiddenError('Access denied. Admin privileges required.');
  }
  next();
};

// Check if user is admin or owns the resource
exports.isAdminOrOwner = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if the user ID in params matches the authenticated user
  if (req.params.userId && req.params.userId === req.user._id.toString()) {
    return next();
  }

  throw new ForbiddenError('Access denied. You can only access your own resources.');
};

// Generate JWT token
exports.generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: config.get('jwt.expiresIn') });
};

