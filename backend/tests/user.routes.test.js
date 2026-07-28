const User = require('../models/User');

describe('User CRUD Operations', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'password123',
        role: 'user'
      };

      const user = await User.create(userData);

      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.isActive).toBe(true);
    });

    it('should hash password before saving', async () => {
      const password = 'password123';
      const user = await User.create({
        name: 'Test User',
        email: 'testuser2@example.com',
        password: password
      });

      expect(user.password).not.toBe(password);
      expect(user.password).toHaveLength(60); // bcrypt hash length
    });

    it('should prevent duplicate emails', async () => {
      await User.create({
        name: 'User 1',
        email: 'duplicate@example.com',
        password: 'password123'
      });

      await expect(User.create({
        name: 'User 2',
        email: 'duplicate@example.com',
        password: 'password456'
      })).rejects.toThrow(/E11000 duplicate key error/);
    });
  });

  describe('User Retrieval', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'testuser3@example.com',
        password: 'password123'
      });
    });

    it('should find user by ID', async () => {
      const foundUser = await User.findById(testUser._id);

      expect(foundUser.name).toBe(testUser.name);
      expect(foundUser.email).toBe(testUser.email);
    });

    it('should exclude password from queries', async () => {
      const foundUser = await User.findById(testUser._id).select('-password');

      expect(foundUser.password).toBeUndefined();
      expect(foundUser.name).toBe(testUser.name);
    });

    it('should find user by email', async () => {
      const foundUser = await User.findOne({ email: testUser.email });

      expect(foundUser.name).toBe(testUser.name);
    });
  });

  describe('User Updates', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Original Name',
        email: 'original@example.com',
        password: 'password123'
      });
    });

    it('should update user fields', async () => {
      testUser.name = 'Updated Name';
      testUser.role = 'admin';
      await testUser.save();

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.role).toBe('admin');
    });

    it('should validate email uniqueness on update', async () => {
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.com',
        password: 'password123'
      });

      testUser.email = 'another@example.com';

      await expect(testUser.save()).rejects.toThrow(/E11000 duplicate key error/);
    });
  });

  describe('User Deletion', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'deleteuser@example.com',
        password: 'password123'
      });
    });

    it('should delete user', async () => {
      await User.findByIdAndDelete(testUser._id);

      const deletedUser = await User.findById(testUser._id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Password Comparison', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'passworduser@example.com',
        password: 'password123'
      });
    });

    it('should return true for correct password', async () => {
      const isValid = await testUser.comparePassword('password123');
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const isValid = await testUser.comparePassword('wrongpassword');
      expect(isValid).toBe(false);
    });
  });
});
