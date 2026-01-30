const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/open', authMiddleware, async (req, res) => {
  try {
    const { sessionId, tradeType, entryPrice, positionSize, stopLoss, takeProfit } = req.body;

    const result = await db.query(`
      INSERT INTO trades 
      (session_id, trade_type, entry_price, position_size, stop_loss, take_profit, entry_time, status)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'open')
      RETURNING *
    `, [sessionId, tradeType, entryPrice, positionSize, stopLoss, takeProfit]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Open trade error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/close', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { exitPrice } = req.body;

    const trade = await db.query('SELECT * FROM trades WHERE id = $1', [id]);
    if (trade.rows.length === 0) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const { trade_type, entry_price, position_size } = trade.rows[0];

    let pnl;
    if (trade_type === 'BUY') {
      pnl = (exitPrice - entry_price) * position_size;
    } else {
      pnl = (entry_price - exitPrice) * position_size;
    }

    const result = await db.query(`
      UPDATE trades 
      SET exit_price = $1, exit_time = NOW(), pnl = $2, status = 'closed'
      WHERE id = $3
      RETURNING *
    `, [exitPrice, pnl, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Close trade error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await db.query(
      'SELECT * FROM trades WHERE session_id = $1 ORDER BY entry_time DESC',
      [sessionId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get trades error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;