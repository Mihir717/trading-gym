/**
 * Fetch REAL historical data for all supported assets
 *
 * Asset Categories:
 * 1. Crypto (from Binance): BTC, ETH, SOL
 * 2. Commodities (from Twelve Data): XAU/USD (Gold), XAG/USD (Silver), WTI/USD (Oil)
 * 3. Forex (from Twelve Data): EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF
 *
 * Data Sources:
 * - Binance API: Free, no key required for crypto
 * - Twelve Data API: Free tier (800 calls/day) for Forex & Commodities
 * - Alpha Vantage API: Backup source for Forex
 *
 * Note: For production, consider using paid APIs for better rate limits
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// API endpoints
const BINANCE_API = 'https://api.binance.com/api/v3/klines';
const TWELVE_DATA_API = 'https://api.twelvedata.com';

// Get API key from environment (optional for limited usage)
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || 'demo';

// All supported assets
const ASSETS = {
  // Crypto - Binance
  crypto: [
    { symbol: 'BTCUSDT', name: 'Bitcoin', source: 'binance', startDate: new Date('2017-08-17') },
    { symbol: 'ETHUSDT', name: 'Ethereum', source: 'binance', startDate: new Date('2017-08-17') },
    { symbol: 'SOLUSDT', name: 'Solana', source: 'binance', startDate: new Date('2020-09-01') },
  ],
  // Commodities - Twelve Data
  commodities: [
    { symbol: 'XAUUSD', name: 'Gold', source: 'twelvedata', apiSymbol: 'XAU/USD', startDate: new Date('2010-01-01') },
    { symbol: 'XAGUSD', name: 'Silver', source: 'twelvedata', apiSymbol: 'XAG/USD', startDate: new Date('2010-01-01') },
    { symbol: 'WTIUSD', name: 'WTI Oil', source: 'twelvedata', apiSymbol: 'WTI/USD', startDate: new Date('2010-01-01') },
  ],
  // Forex - Twelve Data
  forex: [
    { symbol: 'EURUSD', name: 'EUR/USD', source: 'twelvedata', apiSymbol: 'EUR/USD', startDate: new Date('2005-01-01') },
    { symbol: 'GBPUSD', name: 'GBP/USD', source: 'twelvedata', apiSymbol: 'GBP/USD', startDate: new Date('2005-01-01') },
    { symbol: 'USDJPY', name: 'USD/JPY', source: 'twelvedata', apiSymbol: 'USD/JPY', startDate: new Date('2005-01-01') },
    { symbol: 'AUDUSD', name: 'AUD/USD', source: 'twelvedata', apiSymbol: 'AUD/USD', startDate: new Date('2005-01-01') },
    { symbol: 'USDCAD', name: 'USD/CAD', source: 'twelvedata', apiSymbol: 'USD/CAD', startDate: new Date('2005-01-01') },
    { symbol: 'USDCHF', name: 'USD/CHF', source: 'twelvedata', apiSymbol: 'USD/CHF', startDate: new Date('2005-01-01') },
  ]
};

// Timeframes mapping
const TIMEFRAMES = {
  binance: ['5m', '15m', '1h', '4h', '1d'],
  twelvedata: ['5min', '15min', '1h', '4h', '1day']
};

const TIMEFRAME_MAP = {
  '5min': '5m',
  '15min': '15m',
  '1h': '1h',
  '4h': '4h',
  '1day': '1d'
};

// Number of ticks per candle
const TICKS_PER_CANDLE = 100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch candles from Binance API
 */
async function fetchBinanceCandles(symbol, interval, startTime = null) {
  const allCandles = [];
  const batchSize = 1000;
  let currentStartTime = startTime;

  console.log(`   📡 Fetching from Binance...`);

  let iteration = 0;
  const maxIterations = 500;

  while (iteration < maxIterations) {
    const params = new URLSearchParams({
      symbol: symbol,
      interval: interval,
      limit: batchSize.toString(),
      ...(currentStartTime && { startTime: currentStartTime.toString() })
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
        throw new Error(`Binance API error: ${response.status}`);
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

      currentStartTime = data[data.length - 1][0] + 1;
      iteration++;

      if (iteration % 10 === 0) {
        console.log(`   Fetched ${allCandles.length} candles...`);
      }

      await sleep(100);
    } catch (error) {
      console.error(`   Error: ${error.message}`);
      await sleep(5000);
    }
  }

  // Remove duplicates
  const seen = new Set();
  return allCandles.filter(c => {
    const key = c.timestamp.getTime();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Fetch candles from Twelve Data API
 */
async function fetchTwelveDataCandles(apiSymbol, interval, outputsize = 5000) {
  console.log(`   📡 Fetching from Twelve Data...`);

  const params = new URLSearchParams({
    symbol: apiSymbol,
    interval: interval,
    outputsize: outputsize.toString(),
    apikey: TWELVE_DATA_KEY
  });

  const url = `${TWELVE_DATA_API}/time_series?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Twelve Data API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Twelve Data API error');
    }

    if (!data.values || data.values.length === 0) {
      console.log(`   No data returned for ${apiSymbol}`);
      return [];
    }

    const candles = data.values.map(item => ({
      timestamp: new Date(item.datetime),
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseFloat(item.volume || 0),
    }));

    // Sort ascending by timestamp
    candles.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`   ✅ Fetched ${candles.length} candles`);
    return candles;

  } catch (error) {
    console.error(`   Error: ${error.message}`);
    return [];
  }
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
    let startPrice = open;
    let endPrice = close;

    for (let j = 0; j < swings.length; j++) {
      if (position <= swings[j].position) {
        const segmentEnd = swings[j].position;
        if (swings[j].price !== undefined) {
          endPrice = swings[j].price;
        } else {
          endPrice = swings[j].isHigh
            ? high - Math.random() * range * 0.2
            : low + Math.random() * range * 0.2;
        }

        const segmentProgress = segmentEnd > segmentStart
          ? (position - segmentStart) / (segmentEnd - segmentStart)
          : 0;
        const smoothProgress = segmentProgress * segmentProgress * (3 - 2 * segmentProgress);
        targetPrice = startPrice + (endPrice - startPrice) * smoothProgress;
        break;
      }
      segmentStart = swings[j].position;
      if (swings[j].price !== undefined) {
        startPrice = swings[j].price;
      }
    }

    if (targetPrice === undefined) {
      const lastSwing = swings[swings.length - 1];
      const segmentProgress = (position - lastSwing.position) / (1 - lastSwing.position);
      const smoothProgress = segmentProgress * segmentProgress * (3 - 2 * segmentProgress);
      targetPrice = (lastSwing.price || prevPrice) + (close - (lastSwing.price || prevPrice)) * smoothProgress;
    }

    const microNoise = (Math.random() - 0.5) * range * 0.02;
    targetPrice = Math.max(low, Math.min(high, targetPrice + microNoise));

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
 * Process a single asset
 */
async function processAsset(client, asset, timeframes) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 Processing ${asset.name} (${asset.symbol})`);
  console.log(`${'─'.repeat(50)}`);

  for (const tf of timeframes) {
    const normalizedTf = asset.source === 'twelvedata' ? (TIMEFRAME_MAP[tf] || tf) : tf;
    console.log(`\n   ⏰ Timeframe: ${normalizedTf}`);

    let candles = [];

    if (asset.source === 'binance') {
      candles = await fetchBinanceCandles(asset.symbol, tf, asset.startDate.getTime());
    } else if (asset.source === 'twelvedata') {
      candles = await fetchTwelveDataCandles(asset.apiSymbol, tf);
    }

    if (candles.length > 0) {
      await insertCandlesBatch(client, candles, asset.symbol, normalizedTf);
      console.log(`   ✅ Inserted ${candles.length} candles`);

      // Generate ticks
      console.log(`   Generating ticks...`);
      let tickCount = 0;

      for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        const ticks = generateCandleTicks(candle, normalizedTf, TICKS_PER_CANDLE);
        await insertTicksBatch(client, ticks, asset.symbol, normalizedTf, candle.timestamp);
        tickCount += ticks.length;

        if ((i + 1) % 500 === 0) {
          console.log(`   Processed ${i + 1}/${candles.length} candles...`);
        }
      }

      console.log(`   ✅ Generated ${tickCount.toLocaleString()} ticks`);
    } else {
      console.log(`   ⚠️ No candles fetched`);
    }

    // Rate limiting between timeframes
    await sleep(asset.source === 'twelvedata' ? 8000 : 500); // Twelve Data has stricter limits
  }
}

/**
 * Main function
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const categoryArg = args.find(a => a.startsWith('--category='))?.split('=')[1];
  const assetArg = args.find(a => a.startsWith('--asset='))?.split('=')[1];

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🚀 FETCHING HISTORICAL DATA FOR ALL ASSETS');
  console.log('  📊 Sources: Binance (Crypto), Twelve Data (Forex/Commodities)');
  console.log('  🔢 Ticks per candle: ' + TICKS_PER_CANDLE);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (TWELVE_DATA_KEY === 'demo') {
    console.log('⚠️  Note: Using demo API key for Twelve Data.');
    console.log('   For full historical data, set TWELVE_DATA_API_KEY in .env');
    console.log('   Get free API key at: https://twelvedata.com/\n');
  }

  const client = await pool.connect();

  try {
    // Determine which assets to fetch
    let assetsToFetch = [];

    if (assetArg) {
      // Fetch specific asset
      for (const category of Object.values(ASSETS)) {
        const found = category.find(a =>
          a.symbol.toLowerCase().includes(assetArg.toLowerCase()) ||
          a.name.toLowerCase().includes(assetArg.toLowerCase())
        );
        if (found) assetsToFetch.push(found);
      }
    } else if (categoryArg) {
      // Fetch specific category
      assetsToFetch = ASSETS[categoryArg.toLowerCase()] || [];
    } else {
      // Fetch all
      assetsToFetch = [...ASSETS.crypto, ...ASSETS.commodities, ...ASSETS.forex];
    }

    if (assetsToFetch.length === 0) {
      console.log('❌ No assets found matching criteria');
      return;
    }

    console.log(`📋 Assets to fetch: ${assetsToFetch.map(a => a.name).join(', ')}\n`);

    // Process each asset
    for (const asset of assetsToFetch) {
      const timeframes = asset.source === 'binance'
        ? TIMEFRAMES.binance
        : TIMEFRAMES.twelvedata;

      await processAsset(client, asset, timeframes);

      // Delay between assets
      await sleep(2000);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  🎉 DATA FETCH COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════════\n');

    for (const asset of assetsToFetch) {
      const candleCount = await client.query(
        'SELECT timeframe, COUNT(*) FROM market_data WHERE asset = $1 GROUP BY timeframe ORDER BY timeframe',
        [asset.symbol]
      );
      const tickCount = await client.query(
        'SELECT COUNT(*) FROM candle_ticks WHERE asset = $1',
        [asset.symbol]
      );

      console.log(`📊 ${asset.name} (${asset.symbol}):`);
      if (candleCount.rows.length > 0) {
        for (const row of candleCount.rows) {
          console.log(`   - ${row.timeframe}: ${parseInt(row.count).toLocaleString()} candles`);
        }
        console.log(`   Total ticks: ${parseInt(tickCount.rows[0]?.count || 0).toLocaleString()}`);
      } else {
        console.log(`   No data`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Usage instructions
if (process.argv.includes('--help')) {
  console.log(`
Usage: node fetchAllAssetsData.js [options]

Options:
  --category=<name>  Fetch only a specific category (crypto, commodities, forex)
  --asset=<name>     Fetch only a specific asset (e.g., BTCUSDT, EURUSD, XAUUSD)
  --help             Show this help message

Examples:
  node fetchAllAssetsData.js                    # Fetch all assets
  node fetchAllAssetsData.js --category=crypto  # Fetch only crypto
  node fetchAllAssetsData.js --asset=EURUSD     # Fetch only EUR/USD
  node fetchAllAssetsData.js --asset=gold       # Fetch only Gold

Environment Variables:
  TWELVE_DATA_API_KEY  - API key for Twelve Data (Forex/Commodities)
                         Get free key at: https://twelvedata.com/
  `);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
