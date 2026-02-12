/**
 * Fetch REAL historical data for multiple crypto assets from Binance
 *
 * Supported Assets:
 * - BTCUSDT: Bitcoin (Aug 2017 - present)
 * - ETHUSDT: Ethereum (Aug 2017 - present)
 * - SOLUSDT: Solana (Sep 2020 - present)
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

// Assets to fetch
const ASSETS = [
  {
    symbol: 'BTCUSDT',
    name: 'Bitcoin',
    icon: '₿',
    startDate: new Date('2017-08-17'),
  },
  {
    symbol: 'ETHUSDT',
    name: 'Ethereum',
    icon: 'Ξ',
    startDate: new Date('2017-08-17'),
  },
  {
    symbol: 'SOLUSDT',
    name: 'Solana',
    icon: '◎',
    startDate: new Date('2020-09-01'),
  }
];

// Timeframes to fetch
const TIMEFRAMES = ['5m', '15m', '1h', '4h', '1d'];

// Number of ticks per candle for progressive formation
const TICKS_PER_CANDLE = 100;

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch candles from Binance API with pagination
 */
async function fetchAllBinanceCandles(symbol, interval, startTime = null) {
  const allCandles = [];
  const batchSize = 1000;

  const asset = ASSETS.find(a => a.symbol === symbol);
  const minStartTime = asset ? asset.startDate.getTime() : Date.now() - 365 * 24 * 60 * 60 * 1000;
  let currentStartTime = startTime || minStartTime;

  console.log(`📡 Fetching ${symbol} ${interval} candles from Binance (${new Date(currentStartTime).toISOString()} to now)...`);

  let iteration = 0;
  const maxIterations = 500;

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

      const candles = data.map(kline => ({
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));

      allCandles.push(...candles);

      if (data.length < batchSize) break;

      const lastTime = data[data.length - 1][0];
      currentStartTime = lastTime + 1;
      iteration++;

      if (iteration % 10 === 0) {
        console.log(`   Fetched ${allCandles.length} candles so far...`);
      }

      await sleep(100);

    } catch (error) {
      console.error(`   Error fetching batch: ${error.message}`);
      await sleep(5000);
    }
  }

  allCandles.sort((a, b) => a.timestamp - b.timestamp);

  const seen = new Set();
  const uniqueCandles = allCandles.filter(c => {
    const key = c.timestamp.getTime();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`   ✅ Total ${uniqueCandles.length} unique ${interval} candles`);
  return uniqueCandles;
}

/**
 * Generate price path for ticks
 */
function generateDetailedPricePath(open, high, low, close, numPoints) {
  const points = [];
  const isBullish = close >= open;
  const range = high - low;

  const swings = [];
  const numSwings = 3 + Math.floor(Math.random() * 3);

  for (let i = 0; i < numSwings; i++) {
    swings.push({
      position: (i + 1) / (numSwings + 1) + (Math.random() - 0.5) * 0.1,
      isHigh: Math.random() > 0.5
    });
  }

  if (isBullish) {
    swings.push({ position: Math.random() * 0.3, isHigh: false, price: low });
    swings.push({ position: 0.7 + Math.random() * 0.2, isHigh: true, price: high });
  } else {
    swings.push({ position: Math.random() * 0.3, isHigh: true, price: high });
    swings.push({ position: 0.7 + Math.random() * 0.2, isHigh: false, price: low });
  }

  swings.sort((a, b) => a.position - b.position);

  let prevPrice = open;

  for (let i = 0; i < numPoints; i++) {
    const position = i / (numPoints - 1);

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

    if (position > (swings[swings.length - 1]?.position || 0)) {
      segmentStart = swings[swings.length - 1]?.position || 0;
      segmentEnd = 1;
      startPrice = swings[swings.length - 1]?.price || prevPrice;
      endPrice = close;
    }

    const segmentProgress = segmentEnd > segmentStart
      ? (position - segmentStart) / (segmentEnd - segmentStart)
      : 0;

    const smoothProgress = segmentProgress * segmentProgress * (3 - 2 * segmentProgress);
    targetPrice = startPrice + (endPrice - startPrice) * smoothProgress;

    const microNoise = (Math.random() - 0.5) * range * 0.02;
    targetPrice += microNoise;

    targetPrice = Math.max(low, Math.min(high, targetPrice));

    points.push(targetPrice);
    prevPrice = targetPrice;
  }

  points[0] = open;
  points[points.length - 1] = close;

  return points;
}

/**
 * Generate ticks for a candle
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
  const pricePoints = generateDetailedPricePath(open, high, low, close, ticksPerCandle);

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
      price: parseFloat(currentPrice.toFixed(8)),
      running_open: parseFloat(open.toFixed(8)),
      running_high: parseFloat(runningHigh.toFixed(8)),
      running_low: parseFloat(runningLow.toFixed(8)),
      running_close: parseFloat(currentPrice.toFixed(8)),
      final_open: parseFloat(open.toFixed(8)),
      final_high: parseFloat(high.toFixed(8)),
      final_low: parseFloat(low.toFixed(8)),
      final_close: parseFloat(close.toFixed(8)),
      volume: parseFloat((volume / ticksPerCandle).toFixed(8)),
      is_final_tick: i === ticksPerCandle - 1,
    });
  }

  return ticks;
}

/**
 * Batch insert candles
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
 * Batch insert ticks
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
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const specificAsset = args.find(a => a.startsWith('--asset='))?.split('=')[1];
  const specificTimeframe = args.find(a => a.startsWith('--timeframe='))?.split('=')[1];

  const assetsToFetch = specificAsset
    ? ASSETS.filter(a => a.symbol.toLowerCase().includes(specificAsset.toLowerCase()))
    : ASSETS;

  const timeframesToFetch = specificTimeframe
    ? TIMEFRAMES.filter(t => t === specificTimeframe)
    : TIMEFRAMES;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 FETCHING MULTI-ASSET HISTORICAL DATA');
  console.log('  📊 Source: Binance');
  console.log('  🔢 Ticks per candle: ' + TICKS_PER_CANDLE);
  console.log('  📈 Assets: ' + assetsToFetch.map(a => a.name).join(', '));
  console.log('  ⏰ Timeframes: ' + timeframesToFetch.join(', '));
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = await pool.connect();

  try {
    for (const asset of assetsToFetch) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`  ${asset.icon} Processing ${asset.name} (${asset.symbol})`);
      console.log(`${'═'.repeat(60)}`);

      for (const timeframe of timeframesToFetch) {
        console.log(`\n📊 Processing ${asset.symbol} ${timeframe}...`);

        const candles = await fetchAllBinanceCandles(asset.symbol, timeframe);

        if (candles.length > 0) {
          await insertCandlesBatch(client, candles, asset.symbol, timeframe);
          console.log(`   ✅ Inserted ${candles.length} candles`);

          console.log(`   Generating ${TICKS_PER_CANDLE} ticks per candle...`);
          let tickCount = 0;

          for (let i = 0; i < candles.length; i++) {
            const candle = candles[i];
            const ticks = generateCandleTicks(candle, timeframe, TICKS_PER_CANDLE);
            await insertTicksBatch(client, ticks, asset.symbol, timeframe, candle.timestamp);
            tickCount += ticks.length;

            if ((i + 1) % 1000 === 0) {
              console.log(`   Processed ${i + 1}/${candles.length} candles...`);
            }
          }

          console.log(`   ✅ Generated ${tickCount.toLocaleString()} ticks`);
        }

        await sleep(500);
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  🎉 DATA FETCH COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════');

    for (const asset of assetsToFetch) {
      const candleCount = await client.query(
        'SELECT timeframe, COUNT(*) FROM market_data WHERE asset = $1 GROUP BY timeframe ORDER BY timeframe',
        [asset.symbol]
      );
      const tickCount = await client.query(
        'SELECT COUNT(*) FROM candle_ticks WHERE asset = $1',
        [asset.symbol]
      );
      const dateRange = await client.query(
        'SELECT MIN(timestamp), MAX(timestamp) FROM market_data WHERE asset = $1',
        [asset.symbol]
      );

      console.log(`\n📊 ${asset.name} (${asset.symbol}):`);
      console.log(`   Date Range: ${dateRange.rows[0].min?.toISOString().split('T')[0] || 'N/A'} to ${dateRange.rows[0].max?.toISOString().split('T')[0] || 'N/A'}`);
      console.log('   Candles:');
      for (const row of candleCount.rows) {
        console.log(`   - ${row.timeframe}: ${parseInt(row.count).toLocaleString()}`);
      }
      console.log(`   Total ticks: ${parseInt(tickCount.rows[0].count).toLocaleString()}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');

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
