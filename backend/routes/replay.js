const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/candles', authMiddleware, async (req, res) => {
  try {
    const { sessionId, offset = 0, limit = 100 } = req.query;

    const session = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, req.user.userId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { asset, timeframe, start_date } = session.rows[0];

    const candles = await db.query(`
      SELECT timestamp, open, high, low, close, volume
      FROM market_data
      WHERE asset = $1 
        AND timeframe = $2
        AND timestamp >= $3
      ORDER BY timestamp ASC
      LIMIT $4 OFFSET $5
    `, [asset, timeframe, start_date, limit, offset]);

    res.json({
      candles: candles.rows,
      hasMore: candles.rows.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Get candles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;