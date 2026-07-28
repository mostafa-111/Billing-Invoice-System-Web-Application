const config = require('config');

/**
 * Custom Error class for API errors
 */
class APIError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error class for input validation errors
 */
class ValidationError extends APIError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

/**
 * Not Found Error class
 */
class NotFoundError extends APIError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Unauthorized Error class
 */
class UnauthorizedError extends APIError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

/**
 * Forbidden Error class
 */
class ForbiddenError extends APIError {
  constructor(message = 'Access denied') {
    super(message, 403);
  }
}

/**
 * Conflict Error class for duplicate entries
 */
class ConflictError extends APIError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
  }
}

/**
 * Create standardized error response
 */
const createErrorResponse = (error, req) => {
  const isDevelopment = config.get('server.env') === 'development';

  const errorResponse = {
    success: false,
    message: error.message || 'Something went wrong',
    ...(isDevelopment && {
      stack: error.stack,
      error: error
    })
  };

  // Add validation errors if present
  if (error.errors && Array.isArray(error.errors)) {
    errorResponse.errors = error.errors;
  }

  // Add request details in development
  if (isDevelopment) {
    errorResponse.request = {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      body: req.body
    };
  }

  return errorResponse;
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = new APIError(message, 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error = new ConflictError(message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    error = new ValidationError('Validation failed', errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new UnauthorizedError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new UnauthorizedError('Token expired');
  }

  // Send error response
  const statusCode = error.statusCode || 500;
  const errorResponse = createErrorResponse(error, req);

  res.status(statusCode).json(errorResponse);
};

/**
 * Async error handler wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Route');
  next(error);
};

module.exports = {
  APIError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  createErrorResponse
};
