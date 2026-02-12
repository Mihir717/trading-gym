/**
 * Integration tests for authentication routes
 * These tests mock the database to test route handlers
 */

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock the database
jest.mock('../../db', () => ({
  query: jest.fn()
}));

const db = require('../../db');

// Create a test app with the auth routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../../routes/auth'));
  return app;
};

// We need supertest for HTTP assertions
const request = require('supertest');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock: no existing user
      db.query.mockResolvedValueOnce({ rows: [] });
      // Mock: insert new user
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'newuser@test.com', subscription_tier: 'free' }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'newuser@test.com', password: 'password123' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: 1,
        email: 'newuser@test.com',
        subscription_tier: 'free'
      });
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@test.com', password: '12345' }); // 5 chars, minimum is 6

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should reject registration for existing user', async () => {
      // Mock: user already exists
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'existing@test.com' }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@test.com', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'User already exists' });
    });

    it('should hash the password before storing', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'user@test.com', subscription_tier: 'free' }]
      });

      await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@test.com', password: 'mypassword' });

      // Check that the second query (INSERT) was called with a hashed password
      const insertCall = db.query.mock.calls[1];
      const [sql, params] = insertCall;

      expect(sql).toContain('INSERT INTO users');
      expect(params[0]).toBe('user@test.com');
      // Password should be hashed, not plain text
      expect(params[1]).not.toBe('mypassword');
      expect(params[1].startsWith('$2b$')).toBe(true); // bcrypt hash prefix
    });

    it('should return a valid JWT token', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });
      db.query.mockResolvedValueOnce({
        rows: [{ id: 42, email: 'user@test.com', subscription_tier: 'free' }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@test.com', password: 'password123' });

      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(42);
      expect(decoded.email).toBe('user@test.com');
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'user@test.com', password: 'password123' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'user@test.com',
          password_hash: hashedPassword,
          subscription_tier: 'pro'
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'correctpassword' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: 1,
        email: 'user@test.com',
        subscription_tier: 'pro'
      });
    });

    it('should reject login for non-existent user', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should reject login with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'user@test.com',
          password_hash: hashedPassword,
          subscription_tier: 'free'
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'wrongpassword' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid credentials' });
    });

    it('should return a valid JWT token on successful login', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 99,
          email: 'user@test.com',
          password_hash: hashedPassword,
          subscription_tier: 'free'
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'password123' });

      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(99);
      expect(decoded.email).toBe('user@test.com');
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'password123' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });

    it('should not reveal whether email or password was wrong', async () => {
      // Non-existent user
      db.query.mockResolvedValueOnce({ rows: [] });
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'password123' });

      // Wrong password
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'user@test.com', password_hash: hashedPassword }]
      });
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@test.com', password: 'wrongpassword' });

      // Both should return the same generic error message
      expect(response1.body.error).toBe(response2.body.error);
      expect(response1.body.error).toBe('Invalid credentials');
    });
  });
});
