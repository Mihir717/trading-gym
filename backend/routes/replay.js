const express = require('express');
const db = require('../db');
// AUTH DISABLED FOR TESTING
// const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get available date range for historical data
router.get('/date-range', async (req, res) => {
  try {
    const { asset = 'BTCUSDT', timeframe = '1d' } = req.query;

    const result = await db.query(`
      SELECT
        MIN(timestamp) as min_date,
        MAX(timestamp) as max_date,
        COUNT(*) as total_candles
      FROM market_data
      WHERE asset = $1 AND timeframe = $2
    `, [asset, timeframe]);

    if (result.rows.length === 0 || !result.rows[0].min_date) {
      return res.json({
        minDate: null,
        maxDate: null,
        totalCandles: 0,
        message: 'No data available for this asset/timeframe'
      });
    }

    res.json({
      minDate: result.rows[0].min_date,
      maxDate: result.rows[0].max_date,
      totalCandles: parseInt(result.rows[0].total_candles)
    });
  } catch (error) {
    console.error('Get date range error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available timeframes and their date ranges
router.get('/available-data', async (req, res) => {
  try {
    const { asset = 'BTCUSDT' } = req.query;

    const result = await db.query(`
      SELECT
        timeframe,
        MIN(timestamp) as min_date,
        MAX(timestamp) as max_date,
        COUNT(*) as total_candles
      FROM market_data
      WHERE asset = $1
      GROUP BY timeframe
      ORDER BY
        CASE timeframe
          WHEN '5m' THEN 1
          WHEN '15m' THEN 2
          WHEN '1h' THEN 3
          WHEN '4h' THEN 4
          WHEN '1d' THEN 5
          ELSE 6
        END
    `, [asset]);

    res.json({
      asset,
      timeframes: result.rows.map(row => ({
        timeframe: row.timeframe,
        minDate: row.min_date,
        maxDate: row.max_date,
        totalCandles: parseInt(row.total_candles)
      }))
    });
  } catch (error) {
    console.error('Get available data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get candles for a session
router.get('/candles', async (req, res) => {
  try {
    const { sessionId, offset = 0, limit = 100 } = req.query;

    // AUTH DISABLED - skip user check
    const session = await db.query(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
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

// Get candle ticks for progressive candle formation
router.get('/ticks', async (req, res) => {
  try {
    const { sessionId, offset = 0, limit = 100 } = req.query;

    // AUTH DISABLED - skip user check
    const session = await db.query(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { asset, timeframe, start_date } = session.rows[0];

    // Get ticks for candles starting from session start date
    const ticks = await db.query(`
      SELECT
        ct.candle_timestamp,
        ct.tick_index,
        ct.timestamp,
        ct.price,
        ct.running_open,
        ct.running_high,
        ct.running_low,
        ct.running_close,
        ct.final_open,
        ct.final_high,
        ct.final_low,
        ct.final_close,
        ct.volume,
        ct.is_final_tick
      FROM candle_ticks ct
      WHERE ct.asset = $1
        AND ct.timeframe = $2
        AND ct.candle_timestamp >= $3
      ORDER BY ct.candle_timestamp ASC, ct.tick_index ASC
      LIMIT $4 OFFSET $5
    `, [asset, timeframe, start_date, limit, offset]);

    res.json({
      ticks: ticks.rows,
      hasMore: ticks.rows.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Get ticks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get candles with their ticks bundled together
router.get('/candles-with-ticks', async (req, res) => {
  try {
    const { sessionId, offset = 0, limit = 100 } = req.query;

    // AUTH DISABLED - skip user check
    const session = await db.query(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const { asset, timeframe, start_date } = session.rows[0];

    // Get candles
    const candles = await db.query(`
      SELECT timestamp, open, high, low, close, volume
      FROM market_data
      WHERE asset = $1
        AND timeframe = $2
        AND timestamp >= $3
      ORDER BY timestamp ASC
      LIMIT $4 OFFSET $5
    `, [asset, timeframe, start_date, limit, offset]);

    // Get ticks for these candles
    const candleTimestamps = candles.rows.map(c => c.timestamp);

    if (candleTimestamps.length === 0) {
      return res.json({ candles: [], hasMore: false });
    }

    const ticks = await db.query(`
      SELECT
        candle_timestamp,
        tick_index,
        timestamp,
        price,
        running_open,
        running_high,
        running_low,
        running_close,
        is_final_tick
      FROM candle_ticks
      WHERE asset = $1
        AND timeframe = $2
        AND candle_timestamp = ANY($3)
      ORDER BY candle_timestamp ASC, tick_index ASC
    `, [asset, timeframe, candleTimestamps]);

    // Group ticks by candle
    const ticksByCandle = {};
    for (const tick of ticks.rows) {
      const key = tick.candle_timestamp.toISOString();
      if (!ticksByCandle[key]) {
        ticksByCandle[key] = [];
      }
      ticksByCandle[key].push({
        tickIndex: tick.tick_index,
        timestamp: tick.timestamp,
        price: parseFloat(tick.price),
        runningOpen: parseFloat(tick.running_open),
        runningHigh: parseFloat(tick.running_high),
        runningLow: parseFloat(tick.running_low),
        runningClose: parseFloat(tick.running_close),
        isFinalTick: tick.is_final_tick
      });
    }

    // Bundle candles with their ticks
    const candlesWithTicks = candles.rows.map(candle => ({
      timestamp: candle.timestamp,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume),
      ticks: ticksByCandle[candle.timestamp.toISOString()] || []
    }));

    res.json({
      candles: candlesWithTicks,
      hasMore: candles.rows.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Get candles with ticks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
