/**
 * Integration tests for session routes
 */

const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the database
jest.mock('../../db', () => ({
  query: jest.fn()
}));

const db = require('../../db');
const request = require('supertest');

// Create a test app with the session routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/sessions', require('../../routes/sessions'));
  return app;
};

// Helper to generate a valid auth token
const generateToken = (userId = 1) => {
  return jwt.sign(
    { userId, email: 'test@test.com' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Session Routes', () => {
  let app;
  let validToken;

  beforeEach(() => {
    app = createTestApp();
    validToken = generateToken(42); // User ID 42
    jest.clearAllMocks();
  });

  describe('POST /api/sessions/start', () => {
    it('should start a new session successfully', async () => {
      const startDate = new Date('2024-01-15T12:00:00Z');

      // Mock: find random start point
      db.query.mockResolvedValueOnce({
        rows: [{ timestamp: startDate }]
      });

      // Mock: insert session
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 42,
          asset: 'BTCUSDT',
          timeframe: '1h',
          start_date: startDate,
          initial_balance: 10000
        }]
      });

      const response = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          asset: 'BTCUSDT',
          timeframe: '1h',
          initialBalance: 10000
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        sessionId: 1,
        startDate: startDate.toISOString(),
        asset: 'BTCUSDT',
        timeframe: '1h',
        initialBalance: 10000
      });
    });

    it('should use default balance of 10000 if not provided', async () => {
      const startDate = new Date('2024-01-15T12:00:00Z');

      db.query.mockResolvedValueOnce({
        rows: [{ timestamp: startDate }]
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 2,
          user_id: 42,
          asset: 'ETHUSDT',
          timeframe: '4h',
          start_date: startDate,
          initial_balance: 10000
        }]
      });

      const response = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          asset: 'ETHUSDT',
          timeframe: '4h'
          // No initialBalance provided
        });

      expect(response.status).toBe(200);
      expect(response.body.initialBalance).toBe(10000);
    });

    it('should allow custom initial balance', async () => {
      const startDate = new Date('2024-01-15T12:00:00Z');

      db.query.mockResolvedValueOnce({
        rows: [{ timestamp: startDate }]
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 3,
          user_id: 42,
          asset: 'BTCUSDT',
          timeframe: '1d',
          start_date: startDate,
          initial_balance: 50000
        }]
      });

      const response = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          asset: 'BTCUSDT',
          timeframe: '1d',
          initialBalance: 50000
        });

      expect(response.status).toBe(200);
      expect(response.body.initialBalance).toBe(50000);
    });

    it('should return 404 when no market data available', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          asset: 'UNKNOWNASSET',
          timeframe: '1h'
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'No market data available for this asset' });
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .post('/api/sessions/start')
        .send({
          asset: 'BTCUSDT',
          timeframe: '1h'
        });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          asset: 'BTCUSDT',
          timeframe: '1h'
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });

    it('should associate session with the correct user', async () => {
      const startDate = new Date();
      const userToken = generateToken(123); // Specific user ID

      db.query.mockResolvedValueOnce({
        rows: [{ timestamp: startDate }]
      });

      db.query.mockImplementationOnce((sql, params) => {
        // Verify user ID is being passed correctly
        expect(params[0]).toBe(123);
        return Promise.resolve({
          rows: [{
            id: 5,
            user_id: 123,
            asset: 'BTCUSDT',
            timeframe: '1h',
            start_date: startDate,
            initial_balance: 10000
          }]
        });
      });

      const response = await request(app)
        .post('/api/sessions/start')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          asset: 'BTCUSDT',
          timeframe: '1h'
        });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should return session for the owner', async () => {
      const session = {
        id: 1,
        user_id: 42,
        asset: 'BTCUSDT',
        timeframe: '1h',
        start_date: new Date('2024-01-15T12:00:00Z'),
        initial_balance: 10000
      };

      db.query.mockResolvedValueOnce({ rows: [session] });

      const response = await request(app)
        .get('/api/sessions/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.asset).toBe('BTCUSDT');
    });

    it('should return 404 for non-existent session', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/sessions/999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Session not found' });
    });

    it('should return 404 for session belonging to another user', async () => {
      // User 42 is trying to access session belonging to user 99
      db.query.mockResolvedValueOnce({ rows: [] }); // Query includes user_id check

      const response = await request(app)
        .get('/api/sessions/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Session not found' });
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .get('/api/sessions/1');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/sessions/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });

    it('should verify user authorization in query', async () => {
      db.query.mockImplementationOnce((sql, params) => {
        // Verify that the query checks both session ID and user ID
        expect(params).toEqual(['1', 42]);
        return Promise.resolve({ rows: [] });
      });

      await request(app)
        .get('/api/sessions/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id'),
        expect.any(Array)
      );
    });
  });
});
