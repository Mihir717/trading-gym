/**
 * Fetch REAL BTC historical data from multiple sources
 *
 * Data Sources:
 * - Binance API: 2017-present (most accurate, has all timeframes)
 * - CoinGecko API: 2013-2017 (daily data, converted to lower timeframes)
 *
 * Note: Bitcoin started trading in 2010, but reliable exchange data begins around 2013
 *
 * This script fetches ACTUAL HISTORICAL DATA, not simulations.
 * The ticks within candles are interpolated from real OHLC data.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// API endpoints
const BINANCE_API = 'https://api.binance.com/api/v3/klines';
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Timeframes to fetch
const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1d'];

// Number of ticks per candle for progressive formation
const TICKS_PER_CANDLE = 100;

// Binance started BTCUSDT trading around August 2017
const BINANCE_START_DATE = new Date('2017-08-17');

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch candles from Binance API with pagination to get full history
 * Uses forward pagination from startTime to now
 */
async function fetchAllBinanceCandles(symbol, interval, startTime = null) {
  const allCandles = [];
  const batchSize = 1000;

  // Calculate start time based on Binance availability
  const minStartTime = BINANCE_START_DATE.getTime();
  let currentStartTime = startTime || minStartTime;

  console.log(`📡 Fetching ${interval} candles from Binance (${new Date(currentStartTime).toISOString()} to now)...`);

  let iteration = 0;
  const maxIterations = 500; // Higher limit for full history

  while (iteration < maxIterations) {
    const params = new URLSearchParams({
      symbol: symbol,
      interval: interval,
      limit: batchSize.toString(),
      startTime: currentStartTime.toString(),
    });

    const url = `${BINANCE_API}?${params.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          console.log('   Rate limited, waiting 60 seconds...');
          await sleep(60000);
          continue;
        }
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.length === 0) break;

      // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
      const candles = data.map(kline => ({
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));

      allCandles.push(...candles);

      // If we got less than batchSize, we've reached the end
      if (data.length < batchSize) break;

      // Move startTime to after the last candle we got
      const lastTime = data[data.length - 1][0];
      currentStartTime = lastTime + 1;
      iteration++;

      if (iteration % 10 === 0) {
        console.log(`   Fetched ${allCandles.length} candles so far (up to ${new Date(lastTime).toISOString()})...`);
      }

      // Rate limiting - be nice to the API
      await sleep(100);

    } catch (error) {
      console.error(`   Error fetching batch: ${error.message}`);
      await sleep(5000);
    }
  }

  // Sort by timestamp ascending
  allCandles.sort((a, b) => a.timestamp - b.timestamp);

  // Remove duplicates
  const seen = new Set();
  const uniqueCandles = allCandles.filter(c => {
    const key = c.timestamp.getTime();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`   ✅ Total ${uniqueCandles.length} unique ${interval} candles from Binance`);
  return uniqueCandles;
}

/**
 * Fetch historical daily data from CoinGecko for pre-Binance era (2013-2017)
 */
async function fetchCoinGeckoHistory() {
  console.log('📡 Fetching pre-Binance historical data from CoinGecko (2013-2017)...');

  const allCandles = [];

  // CoinGecko allows up to 365 days per request for free tier
  // We need data from ~2013 to August 2017
  const endDate = new Date('2017-08-16');
  const startDate = new Date('2013-04-28'); // First reliable BTC data

  let currentEnd = endDate;

  while (currentEnd > startDate) {
    const currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() - 365);
    if (currentStart < startDate) currentStart.setTime(startDate.getTime());

    const fromTimestamp = Math.floor(currentStart.getTime() / 1000);
    const toTimestamp = Math.floor(currentEnd.getTime() / 1000);

    const url = `${COINGECKO_API}/coins/bitcoin/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`;

    console.log(`   Fetching ${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]}...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 429) {
          console.log('   Rate limited, waiting 60 seconds...');
          await sleep(60000);
          continue;
        }
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.prices && data.prices.length > 0) {
        // CoinGecko returns [timestamp, price] pairs
        // We need to construct OHLC from price data
        // Group by day and create daily candles
        const dailyData = {};

        for (const [timestamp, price] of data.prices) {
          const date = new Date(timestamp);
          date.setUTCHours(0, 0, 0, 0);
          const key = date.getTime();

          if (!dailyData[key]) {
            dailyData[key] = {
              timestamp: date,
              open: price,
              high: price,
              low: price,
              close: price,
              prices: [price]
            };
          } else {
            dailyData[key].high = Math.max(dailyData[key].high, price);
            dailyData[key].low = Math.min(dailyData[key].low, price);
            dailyData[key].close = price;
            dailyData[key].prices.push(price);
          }
        }

        // Convert to candle array
        for (const candle of Object.values(dailyData)) {
          // Estimate volume based on price volatility (CoinGecko free doesn't give volume for range)
          const volatility = (candle.high - candle.low) / candle.low;
          candle.volume = volatility * 10000 * (candle.close / 1000);
          delete candle.prices;
          allCandles.push(candle);
        }
      }

      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() - 1);

      // Rate limiting
      await sleep(1500); // CoinGecko free tier is strict

    } catch (error) {
      console.error(`   Error: ${error.message}`);
      await sleep(5000);
    }
  }

  allCandles.sort((a, b) => a.timestamp - b.timestamp);
  console.log(`   ✅ Total ${allCandles.length} daily candles from CoinGecko (2013-2017)`);

  return allCandles;
}

/**
 * Convert daily candles to lower timeframes (for pre-Binance data)
 * This creates realistic intraday candles from daily OHLC data
 */
function convertDailyToTimeframe(dailyCandles, targetTimeframe) {
  const candlesPerDay = {
    '5m': 288,   // 24 * 60 / 5
    '15m': 96,   // 24 * 60 / 15
    '1h': 24,
    '4h': 6,
    '1d': 1
  };

  const numCandles = candlesPerDay[targetTimeframe];
  if (numCandles === 1) return dailyCandles;

  const result = [];
  const msPerCandle = (24 * 60 * 60 * 1000) / numCandles;

  for (const daily of dailyCandles) {
    const { timestamp, open, high, low, close, volume } = daily;
    const range = high - low;

    // Create a realistic price path through the day
    const pricePoints = generatePricePath(open, high, low, close, numCandles + 1);

    for (let i = 0; i < numCandles; i++) {
      const candleTime = new Date(timestamp.getTime() + i * msPerCandle);
      const startPrice = pricePoints[i];
      const endPrice = pricePoints[i + 1];

      // Create mini-OHLC for this candle
      const candleHigh = Math.max(startPrice, endPrice) + Math.random() * range * 0.1;
      const candleLow = Math.min(startPrice, endPrice) - Math.random() * range * 0.1;

      result.push({
        timestamp: candleTime,
        open: parseFloat(startPrice.toFixed(2)),
        high: parseFloat(Math.min(high, candleHigh).toFixed(2)),
        low: parseFloat(Math.max(low, candleLow).toFixed(2)),
        close: parseFloat(endPrice.toFixed(2)),
        volume: parseFloat((volume / numCandles).toFixed(4))
      });
    }
  }

  return result;
}

/**
 * Generate a realistic price path from open to close hitting high and low
 */
function generatePricePath(open, high, low, close, numPoints) {
  const points = [open];
  const isBullish = close >= open;

  // Determine when we hit high and low
  const highPoint = isBullish ? 0.7 + Math.random() * 0.2 : Math.random() * 0.3;
  const lowPoint = isBullish ? Math.random() * 0.3 : 0.7 + Math.random() * 0.2;

  for (let i = 1; i < numPoints - 1; i++) {
    const progress = i / (numPoints - 1);
    let price;

    if (isBullish) {
      if (progress <= lowPoint) {
        price = open + (low - open) * (progress / lowPoint);
      } else if (progress <= highPoint) {
        price = low + (high - low) * ((progress - lowPoint) / (highPoint - lowPoint));
      } else {
        price = high + (close - high) * ((progress - highPoint) / (1 - highPoint));
      }
    } else {
      if (progress <= highPoint) {
        price = open + (high - open) * (progress / highPoint);
      } else if (progress <= lowPoint) {
        price = high + (low - high) * ((progress - highPoint) / (lowPoint - highPoint));
      } else {
        price = low + (close - low) * ((progress - lowPoint) / (1 - lowPoint));
      }
    }

    // Add small noise
    const noise = (Math.random() - 0.5) * (high - low) * 0.05;
    price = Math.max(low, Math.min(high, price + noise));
    points.push(price);
  }

  points.push(close);
  return points;
}

/**
 * Generate 100 intermediate ticks for progressive candle formation
 * This creates realistic price movements within each candle
 */
function generateCandleTicks(candle, timeframeStr, ticksPerCandle = TICKS_PER_CANDLE) {
  const ticks = [];
  const { timestamp, open, high, low, close, volume } = candle;

  const timeframeMs = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  }[timeframeStr] || 5 * 60 * 1000;

  const tickInterval = timeframeMs / ticksPerCandle;

  // Generate a realistic price path with more detail for 100 ticks
  const pricePoints = generateDetailedPricePath(open, high, low, close, ticksPerCandle);

  // Build tick objects with running OHLC
  let runningHigh = open;
  let runningLow = open;

  for (let i = 0; i < ticksPerCandle; i++) {
    const tickTime = new Date(timestamp.getTime() + i * tickInterval);
    const currentPrice = pricePoints[i];

    runningHigh = Math.max(runningHigh, currentPrice);
    runningLow = Math.min(runningLow, currentPrice);

    ticks.push({
      timestamp: tickTime,
      tick_index: i,
      price: parseFloat(currentPrice.toFixed(2)),
      running_open: parseFloat(open.toFixed(2)),
      running_high: parseFloat(runningHigh.toFixed(2)),
      running_low: parseFloat(runningLow.toFixed(2)),
      running_close: parseFloat(currentPrice.toFixed(2)),
      final_open: parseFloat(open.toFixed(2)),
      final_high: parseFloat(high.toFixed(2)),
      final_low: parseFloat(low.toFixed(2)),
      final_close: parseFloat(close.toFixed(2)),
      volume: parseFloat((volume / ticksPerCandle).toFixed(8)),
      is_final_tick: i === ticksPerCandle - 1,
    });
  }

  return ticks;
}

/**
 * Generate a detailed price path with 100 points showing realistic market microstructure
 */
function generateDetailedPricePath(open, high, low, close, numPoints) {
  const points = [];
  const isBullish = close >= open;
  const range = high - low;

  // Multiple swing points for more realistic movement
  const swings = [];
  const numSwings = 3 + Math.floor(Math.random() * 3); // 3-5 swings

  for (let i = 0; i < numSwings; i++) {
    swings.push({
      position: (i + 1) / (numSwings + 1) + (Math.random() - 0.5) * 0.1,
      isHigh: Math.random() > 0.5
    });
  }

  // Ensure we hit the actual high and low
  if (isBullish) {
    swings.push({ position: Math.random() * 0.3, isHigh: false, price: low });
    swings.push({ position: 0.7 + Math.random() * 0.2, isHigh: true, price: high });
  } else {
    swings.push({ position: Math.random() * 0.3, isHigh: true, price: high });
    swings.push({ position: 0.7 + Math.random() * 0.2, isHigh: false, price: low });
  }

  swings.sort((a, b) => a.position - b.position);

  // Generate smooth path through swing points
  let prevPrice = open;
  let prevPosition = 0;

  for (let i = 0; i < numPoints; i++) {
    const position = i / (numPoints - 1);

    // Find which swing segment we're in
    let targetPrice;
    let segmentStart = 0;
    let segmentEnd = 1;
    let startPrice = open;
    let endPrice = close;

    for (let j = 0; j < swings.length; j++) {
      if (position <= swings[j].position) {
        segmentEnd = swings[j].position;
        if (swings[j].price !== undefined) {
          endPrice = swings[j].price;
        } else {
          endPrice = swings[j].isHigh
            ? high - Math.random() * range * 0.2
            : low + Math.random() * range * 0.2;
        }
        break;
      }
      segmentStart = swings[j].position;
      if (swings[j].price !== undefined) {
        startPrice = swings[j].price;
      } else {
        startPrice = swings[j].isHigh
          ? high - Math.random() * range * 0.2
          : low + Math.random() * range * 0.2;
      }
    }

    // If past all swings, head to close
    if (position > (swings[swings.length - 1]?.position || 0)) {
      segmentStart = swings[swings.length - 1]?.position || 0;
      segmentEnd = 1;
      startPrice = swings[swings.length - 1]?.price || prevPrice;
      endPrice = close;
    }

    // Interpolate within segment
    const segmentProgress = segmentEnd > segmentStart
      ? (position - segmentStart) / (segmentEnd - segmentStart)
      : 0;

    // Use smoothstep for natural movement
    const smoothProgress = segmentProgress * segmentProgress * (3 - 2 * segmentProgress);
    targetPrice = startPrice + (endPrice - startPrice) * smoothProgress;

    // Add micro-noise (market microstructure)
    const microNoise = (Math.random() - 0.5) * range * 0.02;
    targetPrice += microNoise;

    // Ensure within bounds
    targetPrice = Math.max(low, Math.min(high, targetPrice));

    points.push(targetPrice);
    prevPrice = targetPrice;
  }

  // Ensure first and last points are exact
  points[0] = open;
  points[points.length - 1] = close;

  return points;
}

/**
 * Batch insert candles for better performance
 */
async function insertCandlesBatch(client, candles, asset, timeframe) {
  if (candles.length === 0) return;

  const batchSize = 500;
  for (let i = 0; i < candles.length; i += batchSize) {
    const batch = candles.slice(i, i + batchSize);

    const values = [];
    const params = [];
    let paramIndex = 1;

    for (const candle of batch) {
      values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
      params.push(asset, timeframe, candle.timestamp, candle.open, candle.high, candle.low, candle.close, candle.volume);
      paramIndex += 8;
    }

    await client.query(`
      INSERT INTO market_data (asset, timeframe, timestamp, open, high, low, close, volume)
      VALUES ${values.join(', ')}
      ON CONFLICT (asset, timeframe, timestamp) DO UPDATE SET
        open = EXCLUDED.open,
        high = EXCLUDED.high,
        low = EXCLUDED.low,
        close = EXCLUDED.close,
        volume = EXCLUDED.volume
    `, params);
  }
}

/**
 * Batch insert ticks for better performance
 */
async function insertTicksBatch(client, ticks, asset, timeframe, candleTimestamp) {
  if (ticks.length === 0) return;

  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const tick of ticks) {
    values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13}, $${paramIndex + 14}, $${paramIndex + 15})`);
    params.push(
      asset, timeframe, candleTimestamp, tick.tick_index, tick.timestamp, tick.price,
      tick.running_open, tick.running_high, tick.running_low, tick.running_close,
      tick.final_open, tick.final_high, tick.final_low, tick.final_close,
      tick.volume, tick.is_final_tick
    );
    paramIndex += 16;
  }

  await client.query(`
    INSERT INTO candle_ticks (asset, timeframe, candle_timestamp, tick_index, timestamp, price,
      running_open, running_high, running_low, running_close,
      final_open, final_high, final_low, final_close, volume, is_final_tick)
    VALUES ${values.join(', ')}
    ON CONFLICT (asset, timeframe, candle_timestamp, tick_index) DO UPDATE SET
      price = EXCLUDED.price,
      running_open = EXCLUDED.running_open,
      running_high = EXCLUDED.running_high,
      running_low = EXCLUDED.running_low,
      running_close = EXCLUDED.running_close
  `, params);
}

/**
 * Create/update database tables
 */
async function setupDatabase(client) {
  // Ensure market_data unique constraint
  try {
    await client.query(`
      ALTER TABLE market_data
      ADD CONSTRAINT market_data_unique
      UNIQUE (asset, timeframe, timestamp);
    `);
    console.log('✅ Added unique constraint to market_data');
  } catch (err) {
    if (err.code === '42710') {
      console.log('ℹ️  Unique constraint already exists on market_data');
    }
  }

  // Create candle_ticks table
  await client.query(`
    CREATE TABLE IF NOT EXISTS candle_ticks (
      id SERIAL PRIMARY KEY,
      asset VARCHAR(20) NOT NULL,
      timeframe VARCHAR(10) NOT NULL,
      candle_timestamp TIMESTAMP NOT NULL,
      tick_index INTEGER NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      price DECIMAL(20, 8) NOT NULL,
      running_open DECIMAL(20, 8) NOT NULL,
      running_high DECIMAL(20, 8) NOT NULL,
      running_low DECIMAL(20, 8) NOT NULL,
      running_close DECIMAL(20, 8) NOT NULL,
      final_open DECIMAL(20, 8) NOT NULL,
      final_high DECIMAL(20, 8) NOT NULL,
      final_low DECIMAL(20, 8) NOT NULL,
      final_close DECIMAL(20, 8) NOT NULL,
      volume DECIMAL(20, 8) NOT NULL,
      is_final_tick BOOLEAN DEFAULT FALSE,
      UNIQUE(asset, timeframe, candle_timestamp, tick_index)
    );

    CREATE INDEX IF NOT EXISTS idx_candle_ticks_lookup
    ON candle_ticks(asset, timeframe, candle_timestamp, tick_index);

    CREATE INDEX IF NOT EXISTS idx_market_data_date
    ON market_data(asset, timeframe, timestamp);
  `);
  console.log('✅ Database tables ready');
}

/**
 * Main function
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 FETCHING REAL BTC HISTORICAL DATA');
  console.log('  📊 Source: Binance (Aug 2017 - Present)');
  console.log('  🔢 Ticks per candle: ' + TICKS_PER_CANDLE);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = await pool.connect();

  try {
    await setupDatabase(client);

    // Note: CoinGecko now requires API key for historical data
    // Binance data starts from August 2017 which gives us 7+ years of real data
    console.log('───────────────────────────────────────\n');

    for (const timeframe of TIMEFRAMES) {
      console.log(`\n📊 Processing ${timeframe}...`);

      const candles = await fetchAllBinanceCandles('BTCUSDT', timeframe);

      if (candles.length > 0) {
        await insertCandlesBatch(client, candles, 'BTCUSDT', timeframe);
        console.log(`   ✅ Inserted ${candles.length} candles`);

        // Generate ticks
        console.log(`   Generating ${TICKS_PER_CANDLE} ticks per candle...`);
        let tickCount = 0;

        for (let i = 0; i < candles.length; i++) {
          const candle = candles[i];
          const ticks = generateCandleTicks(candle, timeframe, TICKS_PER_CANDLE);
          await insertTicksBatch(client, ticks, 'BTCUSDT', timeframe, candle.timestamp);
          tickCount += ticks.length;

          if ((i + 1) % 1000 === 0) {
            console.log(`   Processed ${i + 1}/${candles.length} candles...`);
          }
        }

        console.log(`   ✅ Generated ${tickCount.toLocaleString()} ticks`);
      }

      // Small delay between timeframes
      await sleep(1000);
    }

    // Summary
    const candleCount = await client.query('SELECT timeframe, COUNT(*) FROM market_data WHERE asset = $1 GROUP BY timeframe', ['BTCUSDT']);
    const tickCount = await client.query('SELECT COUNT(*) FROM candle_ticks WHERE asset = $1', ['BTCUSDT']);
    const dateRange = await client.query('SELECT MIN(timestamp), MAX(timestamp) FROM market_data WHERE asset = $1', ['BTCUSDT']);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  🎉 DATA FETCH COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log(`   Date Range: ${dateRange.rows[0].min?.toISOString().split('T')[0]} to ${dateRange.rows[0].max?.toISOString().split('T')[0]}`);
    console.log('\n   Candles per timeframe:');
    for (const row of candleCount.rows) {
      console.log(`   - ${row.timeframe}: ${parseInt(row.count).toLocaleString()} candles`);
    }
    console.log(`\n   Total ticks: ${parseInt(tickCount.rows[0].count).toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
