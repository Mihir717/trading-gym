/**
 * Integration tests for replay routes
 */

const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the database
jest.mock('../../db', () => ({
  query: jest.fn()
}));

const db = require('../../db');
const request = require('supertest');

// Create a test app with the replay routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/replay', require('../../routes/replay'));
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

describe('Replay Routes', () => {
  let app;
  let validToken;

  beforeEach(() => {
    app = createTestApp();
    validToken = generateToken(42);
    jest.clearAllMocks();
  });

  describe('GET /api/replay/candles', () => {
    it('should return candles for a valid session', async () => {
      const session = {
        id: 1,
        user_id: 42,
        asset: 'BTCUSDT',
        timeframe: '1h',
        start_date: new Date('2024-01-15T00:00:00Z')
      };

      const candles = [
        { timestamp: new Date('2024-01-15T00:00:00Z'), open: 50000, high: 50500, low: 49800, close: 50200, volume: 100 },
        { timestamp: new Date('2024-01-15T01:00:00Z'), open: 50200, high: 50800, low: 50000, close: 50600, volume: 120 },
        { timestamp: new Date('2024-01-15T02:00:00Z'), open: 50600, high: 51000, low: 50400, close: 50900, volume: 150 }
      ];

      // Mock: get session
      db.query.mockResolvedValueOnce({ rows: [session] });
      // Mock: get candles
      db.query.mockResolvedValueOnce({ rows: candles });

      const response = await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1 })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.candles).toHaveLength(3);
      expect(response.body.hasMore).toBe(false); // Less than default limit
    });

    it('should return hasMore=true when more candles available', async () => {
      const session = {
        id: 1,
        user_id: 42,
        asset: 'BTCUSDT',
        timeframe: '1h',
        start_date: new Date('2024-01-15T00:00:00Z')
      };

      // Generate exactly 100 candles (default limit)
      const candles = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000),
        open: 50000 + i,
        high: 50100 + i,
        low: 49900 + i,
        close: 50050 + i,
        volume: 100 + i
      }));

      db.query.mockResolvedValueOnce({ rows: [session] });
      db.query.mockResolvedValueOnce({ rows: candles });

      const response = await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1 })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.candles).toHaveLength(100);
      expect(response.body.hasMore).toBe(true);
    });

    it('should respect offset parameter', async () => {
      const session = {
        id: 1,
        user_id: 42,
        asset: 'BTCUSDT',
        timeframe: '1h',
        start_date: new Date('2024-01-15T00:00:00Z')
      };

      db.query.mockResolvedValueOnce({ rows: [session] });
      db.query.mockImplementationOnce((sql, params) => {
        // Verify offset is passed correctly
        expect(params[4]).toBe('50'); // offset parameter
        return Promise.resolve({ rows: [] });
      });

      await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1, offset: 50 })
        .set('Authorization', `Bearer ${validToken}`);

      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should respect limit parameter', async () => {
      const session = {
        id: 1,
        user_id: 42,
        asset: 'BTCUSDT',
        timeframe: '1h',
        start_date: new Date('2024-01-15T00:00:00Z')
      };

      db.query.mockResolvedValueOnce({ rows: [session] });
      db.query.mockImplementationOnce((sql, params) => {
        // Verify limit is passed correctly
        expect(params[3]).toBe('25'); // limit parameter
        return Promise.resolve({ rows: [] });
      });

      await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1, limit: 25 })
        .set('Authorization', `Bearer ${validToken}`);
    });

    it('should return 404 for non-existent session', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 999 })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Session not found' });
    });

    it('should return 404 for session belonging to another user', async () => {
      // Query includes user_id check, so returns empty for wrong user
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1 })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1 });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1 })
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });

    it('should filter candles by session asset and timeframe', async () => {
      const session = {
        id: 1,
        user_id: 42,
        asset: 'ETHUSDT',
        timeframe: '4h',
        start_date: new Date('2024-01-15T00:00:00Z')
      };

      db.query.mockResolvedValueOnce({ rows: [session] });
      db.query.mockImplementationOnce((sql, params) => {
        // Verify asset and timeframe are used in the query
        expect(params[0]).toBe('ETHUSDT');
        expect(params[1]).toBe('4h');
        return Promise.resolve({ rows: [] });
      });

      await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1 })
        .set('Authorization', `Bearer ${validToken}`);
    });

    it('should filter candles starting from session start_date', async () => {
      const startDate = new Date('2024-06-01T12:00:00Z');
      const session = {
        id: 1,
        user_id: 42,
        asset: 'BTCUSDT',
        timeframe: '1h',
        start_date: startDate
      };

      db.query.mockResolvedValueOnce({ rows: [session] });
      db.query.mockImplementationOnce((sql, params) => {
        // Verify start_date is used
        expect(params[2]).toEqual(startDate);
        return Promise.resolve({ rows: [] });
      });

      await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1 })
        .set('Authorization', `Bearer ${validToken}`);
    });

    it('should return candles in ascending timestamp order', async () => {
      const session = {
        id: 1,
        user_id: 42,
        asset: 'BTCUSDT',
        timeframe: '1h',
        start_date: new Date('2024-01-15T00:00:00Z')
      };

      const candles = [
        { timestamp: new Date('2024-01-15T00:00:00Z'), open: 50000 },
        { timestamp: new Date('2024-01-15T01:00:00Z'), open: 50100 },
        { timestamp: new Date('2024-01-15T02:00:00Z'), open: 50200 }
      ];

      db.query.mockResolvedValueOnce({ rows: [session] });
      db.query.mockResolvedValueOnce({ rows: candles });

      const response = await request(app)
        .get('/api/replay/candles')
        .query({ sessionId: 1 })
        .set('Authorization', `Bearer ${validToken}`);

      // Verify ascending order
      const timestamps = response.body.candles.map(c => new Date(c.timestamp).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }
    });
  });
});
