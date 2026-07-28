const User = require('../models/User');

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'user'
      };

      const user = await User.create(userData);

      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(userData.role);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should hash password before saving', async () => {
      const password = 'password123';
      const user = await User.create({
        name: 'John Doe',
        email: 'john2@example.com',
        password: password
      });

      expect(user.password).not.toBe(password);
      expect(user.password).toHaveLength(60); // bcrypt hash length
    });

    it('should set default role to user', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john3@example.com',
        password: 'password123'
      });

      expect(user.role).toBe('user');
    });

    it('should set default isActive to true', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john4@example.com',
        password: 'password123'
      });

      expect(user.isActive).toBe(true);
    });

    it('should convert email to lowercase', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'JOHN5@EXAMPLE.COM',
        password: 'password123'
      });

      expect(user.email).toBe('john5@example.com');
    });

    it('should trim whitespace from name and email', async () => {
      const user = await User.create({
        name: '  John Doe  ',
        email: '  john6@example.com  ',
        password: 'password123'
      });

      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john6@example.com');
    });
  });

  describe('Password Validation', () => {
    it('should require minimum 6 characters', async () => {
      await expect(User.create({
        name: 'John Doe',
        email: 'john7@example.com',
        password: '12345' // 5 characters
      })).rejects.toThrow(/Password must be at least 6 characters/);
    });

    it('should accept exactly 6 characters', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john8@example.com',
        password: '123456' // 6 characters
      });

      expect(user).toBeDefined();
    });
  });

  describe('Email Validation', () => {
    it('should require valid email format', async () => {
      await expect(User.create({
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123'
      })).rejects.toThrow(/Please enter a valid email/);
    });

    it('should enforce unique email constraint', async () => {
      await User.create({
        name: 'John Doe',
        email: 'unique@example.com',
        password: 'password123'
      });

      await expect(User.create({
        name: 'Jane Doe',
        email: 'unique@example.com',
        password: 'password456'
      })).rejects.toThrow(/E11000 duplicate key error/);
    });
  });

  describe('Password Comparison', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        name: 'John Doe',
        email: 'john9@example.com',
        password: 'password123'
      });
    });

    it('should return true for correct password', async () => {
      const isValid = await user.comparePassword('password123');
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const isValid = await user.comparePassword('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('JSON Serialization', () => {
    it('should exclude password from JSON output', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john10@example.com',
        password: 'password123'
      });

      const userJson = user.toJSON();
      expect(userJson.password).toBeUndefined();
    });

    it('should include all other fields in JSON output', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john11@example.com',
        password: 'password123',
        role: 'admin'
      });

      const userJson = user.toJSON();
      expect(userJson.name).toBe('John Doe');
      expect(userJson.email).toBe('john11@example.com');
      expect(userJson.role).toBe('admin');
      expect(userJson.isActive).toBe(true);
      expect(userJson._id).toBeDefined();
    });
  });

  describe('Field Validation', () => {
    it('should require name field', async () => {
      await expect(User.create({
        email: 'john12@example.com',
        password: 'password123'
      })).rejects.toThrow(/Name is required/);
    });

    it('should require email field', async () => {
      await expect(User.create({
        name: 'John Doe',
        password: 'password123'
      })).rejects.toThrow(/Email is required/);
    });

    it('should require password field', async () => {
      await expect(User.create({
        name: 'John Doe',
        email: 'john13@example.com'
      })).rejects.toThrow(/Password is required/);
    });

    it('should only allow valid roles', async () => {
      await expect(User.create({
        name: 'John Doe',
        email: 'john14@example.com',
        password: 'password123',
        role: 'invalid'
      })).rejects.toThrow(/is not a valid enum value/);
    });
  });
});
