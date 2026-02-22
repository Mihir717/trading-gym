const express = require('express');
const db = require('../db');
// AUTH DISABLED FOR TESTING
// const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/start', async (req, res) => {
  try {
    const { asset, timeframe, initialBalance, startDate } = req.body;
    const userId = 1; // AUTH DISABLED - use dummy user ID

    let sessionStartDate;

    if (startDate) {
      // User specified a start date - find the nearest available candle
      const nearestCandle = await db.query(`
        SELECT timestamp
        FROM market_data
        WHERE asset = $1 AND timeframe = $2 AND timestamp >= $3
        ORDER BY timestamp ASC
        LIMIT 1
      `, [asset, timeframe, startDate]);

      if (nearestCandle.rows.length === 0) {
        // If no candle after the date, get the last available candle
        const lastCandle = await db.query(`
          SELECT timestamp
          FROM market_data
          WHERE asset = $1 AND timeframe = $2
          ORDER BY timestamp DESC
          LIMIT 1
        `, [asset, timeframe]);

        if (lastCandle.rows.length === 0) {
          return res.status(404).json({ error: 'No market data available for this asset/timeframe' });
        }
        sessionStartDate = lastCandle.rows[0].timestamp;
      } else {
        sessionStartDate = nearestCandle.rows[0].timestamp;
      }
    } else {
      // No start date specified - pick a random start point
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
      sessionStartDate = randomStart.rows[0].timestamp;
    }

    const result = await db.query(`
      INSERT INTO sessions (user_id, asset, timeframe, start_date, initial_balance)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, asset, timeframe, sessionStartDate, initialBalance || 10000]);

    const session = result.rows[0];

    // Get the price at session start for reference
    const startCandle = await db.query(`
      SELECT open, close FROM market_data
      WHERE asset = $1 AND timeframe = $2 AND timestamp = $3
    `, [asset, timeframe, sessionStartDate]);

    const startPrice = startCandle.rows[0]?.open || 0;

    res.json({
      sessionId: session.id,
      startDate: session.start_date,
      asset: session.asset,
      timeframe: session.timeframe,
      initialBalance: parseFloat(session.initial_balance),
      startPrice: parseFloat(startPrice)
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // AUTH DISABLED - skip user check
    const result = await db.query(
      'SELECT * FROM sessions WHERE id = $1',
      [id]
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
