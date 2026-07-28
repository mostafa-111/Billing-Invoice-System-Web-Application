const request = require('supertest');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// Create a test user
const createTestUser = async (userData = {}) => {
  const defaultData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'user',
    isActive: true
  };

  const user = await User.create({ ...defaultData, ...userData });
  return user;
};

// Create an admin user
const createAdminUser = async (userData = {}) => {
  return createTestUser({ ...userData, role: 'admin', email: 'admin@example.com' });
};

// Generate auth token for user
const getAuthToken = (user) => {
  return generateToken(user._id);
};

// Make authenticated request
const makeAuthRequest = (app, method, url) => {
  return request(app)[method.toLowerCase()](url);
};

// Create authenticated request with token
const makeAuthenticatedRequest = (app, method, url, token) => {
  return request(app)[method.toLowerCase()](url)
    .set('Authorization', `Bearer ${token}`);
};

// Create authenticated request for user
const makeUserRequest = (app, method, url) => {
  return request(app)[method.toLowerCase()](url)
    .set('Authorization', `Bearer ${global.testUserToken || ''}`);
};

// Create authenticated request for admin
const makeAdminRequest = (app, method, url) => {
  return request(app)[method.toLowerCase()](url)
    .set('Authorization', `Bearer ${global.testAdminToken || ''}`);
};

module.exports = {
  createTestUser,
  createAdminUser,
  getAuthToken,
  makeAuthRequest,
  makeAuthenticatedRequest,
  makeUserRequest,
  makeAdminRequest
};
