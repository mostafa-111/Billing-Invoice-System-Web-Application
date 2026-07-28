const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  // Connect to the in-memory database
  await mongoose.connect(mongoUri);

  // Create test users and tokens
  const testUser = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'user'
  });

  const testAdmin = await User.create({
    name: 'Test Admin',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin'
  });

  global.testUserToken = generateToken(testUser._id);
  global.testAdminToken = generateToken(testAdmin._id);
  global.testUser = testUser;
  global.testAdmin = testAdmin;
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  // Stop the in-memory MongoDB server
  await mongoServer.stop();
});
