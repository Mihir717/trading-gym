/**
 * Integration tests for trade routes
 */

const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the database
jest.mock('../../db', () => ({
  query: jest.fn()
}));

const db = require('../../db');
const request = require('supertest');

// Create a test app with the trade routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/trades', require('../../routes/trades'));
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

describe('Trade Routes', () => {
  let app;
  let validToken;

  beforeEach(() => {
    app = createTestApp();
    validToken = generateToken();
    jest.clearAllMocks();
  });

  describe('POST /api/trades/open', () => {
    it('should open a new BUY trade successfully', async () => {
      const tradeData = {
        sessionId: 1,
        tradeType: 'BUY',
        entryPrice: 50000,
        positionSize: 0.1,
        stopLoss: 49000,
        takeProfit: 52000
      };

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: 1,
          trade_type: 'BUY',
          entry_price: 50000,
          position_size: 0.1,
          stop_loss: 49000,
          take_profit: 52000,
          status: 'open'
        }]
      });

      const response = await request(app)
        .post('/api/trades/open')
        .set('Authorization', `Bearer ${validToken}`)
        .send(tradeData);

      expect(response.status).toBe(200);
      expect(response.body.trade_type).toBe('BUY');
      expect(response.body.entry_price).toBe(50000);
      expect(response.body.status).toBe('open');
    });

    it('should open a new SELL trade successfully', async () => {
      const tradeData = {
        sessionId: 1,
        tradeType: 'SELL',
        entryPrice: 50000,
        positionSize: 0.5,
        stopLoss: 51000,
        takeProfit: 48000
      };

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 2,
          session_id: 1,
          trade_type: 'SELL',
          entry_price: 50000,
          position_size: 0.5,
          stop_loss: 51000,
          take_profit: 48000,
          status: 'open'
        }]
      });

      const response = await request(app)
        .post('/api/trades/open')
        .set('Authorization', `Bearer ${validToken}`)
        .send(tradeData);

      expect(response.status).toBe(200);
      expect(response.body.trade_type).toBe('SELL');
    });

    it('should open a trade without SL/TP', async () => {
      const tradeData = {
        sessionId: 1,
        tradeType: 'BUY',
        entryPrice: 50000,
        positionSize: 0.1,
        stopLoss: null,
        takeProfit: null
      };

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 3,
          session_id: 1,
          trade_type: 'BUY',
          entry_price: 50000,
          position_size: 0.1,
          stop_loss: null,
          take_profit: null,
          status: 'open'
        }]
      });

      const response = await request(app)
        .post('/api/trades/open')
        .set('Authorization', `Bearer ${validToken}`)
        .send(tradeData);

      expect(response.status).toBe(200);
      expect(response.body.stop_loss).toBeNull();
      expect(response.body.take_profit).toBeNull();
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .post('/api/trades/open')
        .send({ sessionId: 1, tradeType: 'BUY', entryPrice: 50000, positionSize: 0.1 });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/trades/open')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ sessionId: 1, tradeType: 'BUY', entryPrice: 50000, positionSize: 0.1 });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });
  });

  describe('PUT /api/trades/:id/close', () => {
    it('should close a BUY trade with profit', async () => {
      // First query: get the trade
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          trade_type: 'BUY',
          entry_price: 50000,
          position_size: 0.1
        }]
      });

      // Second query: update the trade
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          trade_type: 'BUY',
          entry_price: 50000,
          exit_price: 51000,
          position_size: 0.1,
          pnl: 100, // (51000 - 50000) * 0.1
          status: 'closed'
        }]
      });

      const response = await request(app)
        .put('/api/trades/1/close')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ exitPrice: 51000 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('closed');
      expect(response.body.pnl).toBe(100);
    });

    it('should close a BUY trade with loss', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          trade_type: 'BUY',
          entry_price: 50000,
          position_size: 0.1
        }]
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          trade_type: 'BUY',
          entry_price: 50000,
          exit_price: 49000,
          position_size: 0.1,
          pnl: -100, // (49000 - 50000) * 0.1
          status: 'closed'
        }]
      });

      const response = await request(app)
        .put('/api/trades/1/close')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ exitPrice: 49000 });

      expect(response.status).toBe(200);
      expect(response.body.pnl).toBe(-100);
    });

    it('should close a SELL trade with profit', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 2,
          trade_type: 'SELL',
          entry_price: 50000,
          position_size: 0.1
        }]
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 2,
          trade_type: 'SELL',
          entry_price: 50000,
          exit_price: 49000,
          position_size: 0.1,
          pnl: 100, // (50000 - 49000) * 0.1
          status: 'closed'
        }]
      });

      const response = await request(app)
        .put('/api/trades/2/close')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ exitPrice: 49000 });

      expect(response.status).toBe(200);
      expect(response.body.pnl).toBe(100);
    });

    it('should close a SELL trade with loss', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 2,
          trade_type: 'SELL',
          entry_price: 50000,
          position_size: 0.1
        }]
      });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 2,
          trade_type: 'SELL',
          entry_price: 50000,
          exit_price: 51000,
          position_size: 0.1,
          pnl: -100, // (50000 - 51000) * 0.1
          status: 'closed'
        }]
      });

      const response = await request(app)
        .put('/api/trades/2/close')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ exitPrice: 51000 });

      expect(response.status).toBe(200);
      expect(response.body.pnl).toBe(-100);
    });

    it('should return 404 for non-existent trade', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/trades/999/close')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ exitPrice: 50000 });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Trade not found' });
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .put('/api/trades/1/close')
        .send({ exitPrice: 50000 });

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/trades/1/close')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ exitPrice: 50000 });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });
  });

  describe('GET /api/trades/session/:sessionId', () => {
    it('should return all trades for a session', async () => {
      const trades = [
        { id: 1, session_id: 1, trade_type: 'BUY', status: 'closed', pnl: 100 },
        { id: 2, session_id: 1, trade_type: 'SELL', status: 'closed', pnl: -50 },
        { id: 3, session_id: 1, trade_type: 'BUY', status: 'open', pnl: null }
      ];

      db.query.mockResolvedValueOnce({ rows: trades });

      const response = await request(app)
        .get('/api/trades/session/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body[0].trade_type).toBe('BUY');
    });

    it('should return empty array for session with no trades', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/trades/session/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .get('/api/trades/session/1');

      expect(response.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/trades/session/1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });
  });

  describe('P&L Calculation Verification', () => {
    it('should calculate correct P&L for large BUY position', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          trade_type: 'BUY',
          entry_price: 45000.50,
          position_size: 2.5
        }]
      });

      // Spy on the db.query to capture the P&L calculation
      db.query.mockImplementationOnce((sql, params) => {
        const [exitPrice, pnl, id] = params;
        // Expected: (47500.75 - 45000.50) * 2.5 = 6250.625
        expect(pnl).toBeCloseTo(6250.625, 2);
        return Promise.resolve({
          rows: [{
            id: 1,
            trade_type: 'BUY',
            entry_price: 45000.50,
            exit_price: exitPrice,
            position_size: 2.5,
            pnl: pnl,
            status: 'closed'
          }]
        });
      });

      const response = await request(app)
        .put('/api/trades/1/close')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ exitPrice: 47500.75 });

      expect(response.status).toBe(200);
    });

    it('should calculate correct P&L for large SELL position', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          trade_type: 'SELL',
          entry_price: 60000,
          position_size: 1.5
        }]
      });

      db.query.mockImplementationOnce((sql, params) => {
        const [exitPrice, pnl, id] = params;
        // Expected: (60000 - 55000) * 1.5 = 7500
        expect(pnl).toBe(7500);
        return Promise.resolve({
          rows: [{
            id: 1,
            trade_type: 'SELL',
            entry_price: 60000,
            exit_price: exitPrice,
            position_size: 1.5,
            pnl: pnl,
            status: 'closed'
          }]
        });
      });

      const response = await request(app)
        .put('/api/trades/1/close')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ exitPrice: 55000 });

      expect(response.status).toBe(200);
    });
  });
});
