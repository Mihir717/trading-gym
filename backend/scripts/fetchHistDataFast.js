/**
 * FAST Fetch historical Forex & Commodities data (2000-2026)
 *
 * This optimized version:
 * 1. Generates realistic sample data for each asset
 * 2. Aggregates to 5m, 15m, 1h, 4h, 1d timeframes
 * 3. Uses batch inserts for speed
 * 4. Skips tick generation (can be done later)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
});

// Assets
const ASSETS = {
  'EURUSD': { name: 'EUR/USD', basePrice: 1.10, volatility: 0.0008 },
  'GBPUSD': { name: 'GBP/USD', basePrice: 1.25, volatility: 0.0010 },
  'USDJPY': { name: 'USD/JPY', basePrice: 110.00, volatility: 0.08 },
  'AUDUSD': { name: 'AUD/USD', basePrice: 0.70, volatility: 0.0008 },
  'USDCAD': { name: 'USD/CAD', basePrice: 1.30, volatility: 0.0006 },
  'USDCHF': { name: 'USD/CHF', basePrice: 0.95, volatility: 0.0006 },
  'XAUUSD': { name: 'Gold', basePrice: 1200.00, volatility: 2.0 },
  'XAGUSD': { name: 'Silver', basePrice: 18.00, volatility: 0.15 },
  'WTIUSD': { name: 'WTI Oil', basePrice: 60.00, volatility: 0.5 },
};

const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1d'];

/**
 * Generate candles for an asset for a specific year
 */
function generateYearData(asset, year) {
  const config = ASSETS[asset];
  if (!config) return [];

  const candles = [];
  const startDate = new Date(`${year}-01-01T00:00:00Z`);
  const endDate = new Date(`${year}-12-31T23:59:00Z`);

  // Start with base price with some yearly variation
  let price = config.basePrice * (0.9 + Math.random() * 0.2);
  const vol = config.volatility;

  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const day = currentDate.getDay();

    // Skip weekends for forex/commodities
    if (day === 0 || day === 6) {
      currentDate = new Date(currentDate.getTime() + 60000);
      continue;
    }

    // Random walk with trends
    const trend = Math.sin(currentDate.getTime() / (86400000 * 30)) * vol * 0.5;
    const change = (Math.random() - 0.5) * vol * 2 + trend;
    const meanReversion = (config.basePrice - price) * 0.00005;
    price = Math.max(config.basePrice * 0.5, price + change + meanReversion);

    const range = vol * (0.5 + Math.random());
    const high = price + range;
    const low = price - range;
    const open = low + Math.random() * (high - low);
    const close = low + Math.random() * (high - low);

    candles.push({
      timestamp: new Date(currentDate),
      open: Math.max(low, Math.min(high, open)),
      high,
      low,
      close: Math.max(low, Math.min(high, close)),
      volume: Math.floor(Math.random() * 1000) + 100
    });

    currentDate = new Date(currentDate.getTime() + 60000);
  }

  return candles;
}

/**
 * Aggregate 1-minute candles to higher timeframes
 */
function aggregateCandles(minuteCandles, targetTimeframe) {
  const tfMinutes = { '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440 };
  const minutes = tfMinutes[targetTimeframe];
  if (!minutes || minuteCandles.length === 0) return [];

  const aggregated = [];
  let bucket = [];
  let bucketStart = null;

  for (const candle of minuteCandles) {
    const candleTime = candle.timestamp.getTime();
    const bucketTime = Math.floor(candleTime / (minutes * 60000)) * (minutes * 60000);

    if (bucketStart === null) bucketStart = bucketTime;

    if (bucketTime !== bucketStart && bucket.length > 0) {
      aggregated.push({
        timestamp: new Date(bucketStart),
        open: bucket[0].open,
        high: Math.max(...bucket.map(c => c.high)),
        low: Math.min(...bucket.map(c => c.low)),
        close: bucket[bucket.length - 1].close,
        volume: bucket.reduce((sum, c) => sum + c.volume, 0)
      });
      bucket = [];
      bucketStart = bucketTime;
    }
    bucket.push(candle);
  }

  if (bucket.length > 0) {
    aggregated.push({
      timestamp: new Date(bucketStart),
      open: bucket[0].open,
      high: Math.max(...bucket.map(c => c.high)),
      low: Math.min(...bucket.map(c => c.low)),
      close: bucket[bucket.length - 1].close,
      volume: bucket.reduce((sum, c) => sum + c.volume, 0)
    });
  }

  return aggregated;
}

/**
 * Batch insert candles (optimized)
 */
async function insertCandles(pool, candles, asset, timeframe) {
  if (candles.length === 0) return;

  const batchSize = 1000;
  for (let i = 0; i < candles.length; i += batchSize) {
    const batch = candles.slice(i, i + batchSize);
    const values = [];
    const params = [];
    let idx = 1;

    for (const c of batch) {
      values.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
      params.push(asset, timeframe, c.timestamp, c.open, c.high, c.low, c.close, c.volume);
      idx += 8;
    }

    await pool.query(`
      INSERT INTO market_data (asset, timeframe, timestamp, open, high, low, close, volume)
      VALUES ${values.join(',')}
      ON CONFLICT (asset, timeframe, timestamp) DO UPDATE SET
        open=EXCLUDED.open, high=EXCLUDED.high, low=EXCLUDED.low, close=EXCLUDED.close, volume=EXCLUDED.volume
    `, params);
  }
}

/**
 * Process a single asset
 */
async function processAsset(pool, asset, years) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📊 ${ASSETS[asset]?.name || asset} (${asset})`);
  console.log(`${'═'.repeat(50)}`);

  // Collect all minute candles across years
  let allMinuteCandles = [];

  for (const year of years) {
    process.stdout.write(`   ${year}...`);
    const yearCandles = generateYearData(asset, year);
    allMinuteCandles = allMinuteCandles.concat(yearCandles);
    console.log(` ${yearCandles.length.toLocaleString()} candles`);
  }

  console.log(`   Total: ${allMinuteCandles.length.toLocaleString()} 1-minute candles`);

  // Process each timeframe
  for (const tf of TIMEFRAMES) {
    const candles = aggregateCandles(allMinuteCandles, tf);
    console.log(`   ${tf}: ${candles.length.toLocaleString()} candles - inserting...`);

    // Delete old data first
    await pool.query('DELETE FROM market_data WHERE asset = $1 AND timeframe = $2', [asset, tf]);

    // Insert new data
    await insertCandles(pool, candles, asset, tf);
    console.log(`   ${tf}: ✅ Done`);
  }
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const assetArg = args.find(a => a.startsWith('--asset='))?.split('=')[1]?.toUpperCase();

  // Default: 2000-2026
  let startYear = 2000;
  let endYear = 2026;

  const yearsArg = args.find(a => a.startsWith('--years='))?.split('=')[1];
  if (yearsArg && yearsArg.includes('-')) {
    [startYear, endYear] = yearsArg.split('-').map(Number);
  }

  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 FAST HISTORICAL DATA GENERATOR');
  console.log('  📅 Years: ' + years[0] + ' - ' + years[years.length - 1]);
  console.log('  📊 Timeframes: ' + TIMEFRAMES.join(', '));
  console.log('═══════════════════════════════════════════════════════════════');

  const assetsToProcess = assetArg && ASSETS[assetArg] ? [assetArg] : Object.keys(ASSETS);
  console.log(`📋 Assets: ${assetsToProcess.join(', ')}\n`);

  try {
    for (const asset of assetsToProcess) {
      await processAsset(pool, asset, years);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  🎉 COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════');

    const result = await pool.query(`
      SELECT asset, timeframe, COUNT(*) as count
      FROM market_data
      WHERE asset = ANY($1)
      GROUP BY asset, timeframe
      ORDER BY asset, timeframe
    `, [assetsToProcess]);

    let current = '';
    for (const row of result.rows) {
      if (row.asset !== current) {
        console.log(`\n${row.asset}:`);
        current = row.asset;
      }
      console.log(`  ${row.timeframe}: ${parseInt(row.count).toLocaleString()} candles`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
