const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { asset, timeframe, initialBalance } = req.body;
    const userId = req.user.userId;

    const randomStart = await db.query(`
      SELECT timestamp 
      FROM market_data 
      WHERE asset = $1 AND timeframe = $2
      ORDER BY RANDOM() 
      LIMIT 1
    `, [asset, timeframe]);

    if (randomStart.rows.length === 0) {
      return res.status(404).json({ error: 'No market data available for this asset' });
    }

    const startDate = randomStart.rows[0].timestamp;

    const result = await db.query(`
      INSERT INTO sessions (user_id, asset, timeframe, start_date, initial_balance)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, asset, timeframe, startDate, initialBalance || 10000]);

    const session = result.rows[0];

    res.json({
      sessionId: session.id,
      startDate: session.start_date,
      asset: session.asset,
      timeframe: session.timeframe,
      initialBalance: session.initial_balance
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;