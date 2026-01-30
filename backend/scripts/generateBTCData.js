require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function generateBTCCandles() {
  console.log('🔄 Generating sample BTC data...');
  
  const client = await pool.connect();
  
  try {
    let price = 45000;
    const startDate = new Date('2024-01-01T00:00:00Z');

    for (let i = 0; i < 5000; i++) {
      const timestamp = new Date(startDate.getTime() + i * 5 * 60 * 1000);
      const change = (Math.random() - 0.5) * 200;
      const open = price;
      const close = price + change;
      const volatility = Math.random() * 150;
      const high = Math.max(open, close) + volatility;
      const low = Math.min(open, close) - volatility;
      
      await client.query(`
        INSERT INTO market_data (asset, timeframe, timestamp, open, high, low, close, volume)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [
        'BTCUSDT',
        '5m',
        timestamp,
        parseFloat(open.toFixed(2)),
        parseFloat(high.toFixed(2)),
        parseFloat(low.toFixed(2)),
        parseFloat(close.toFixed(2)),
        Math.random() * 50 + 10
      ]);

      if (i % 500 === 0) {
        console.log(`✅ Inserted ${i}/5000 candles`);
      }
      
      price = close;
    }

    console.log('🎉 Complete!');
  } finally {
    client.release();
    await pool.end();
  }
}

generateBTCCandles().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});