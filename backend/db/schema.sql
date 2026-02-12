-- Trading Gym Database Schema
-- Run this in your Supabase SQL Editor or PostgreSQL client

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  asset VARCHAR(20) NOT NULL DEFAULT 'BTCUSDT',
  timeframe VARCHAR(10) NOT NULL DEFAULT '1h',
  start_date TIMESTAMP NOT NULL,
  initial_balance DECIMAL(20, 2) DEFAULT 10000,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active'
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  trade_type VARCHAR(10) NOT NULL, -- 'BUY' or 'SELL'
  entry_price DECIMAL(20, 8) NOT NULL,
  exit_price DECIMAL(20, 8),
  position_size DECIMAL(20, 8) NOT NULL,
  stop_loss DECIMAL(20, 8),
  take_profit DECIMAL(20, 8),
  entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMP,
  exit_reason VARCHAR(50), -- 'manual', 'stop_loss', 'take_profit'
  pnl DECIMAL(20, 8),
  status VARCHAR(20) DEFAULT 'open' -- 'open', 'closed'
);

-- Market data table (candles)
CREATE TABLE IF NOT EXISTS market_data (
  id SERIAL PRIMARY KEY,
  asset VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  open DECIMAL(20, 8) NOT NULL,
  high DECIMAL(20, 8) NOT NULL,
  low DECIMAL(20, 8) NOT NULL,
  close DECIMAL(20, 8) NOT NULL,
  volume DECIMAL(20, 8),
  UNIQUE(asset, timeframe, timestamp)
);

-- Candle ticks table (for progressive candle formation)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_data_lookup ON market_data(asset, timeframe, timestamp);
CREATE INDEX IF NOT EXISTS idx_candle_ticks_lookup ON candle_ticks(asset, timeframe, candle_timestamp, tick_index);
CREATE INDEX IF NOT EXISTS idx_trades_session ON trades(session_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- Enable RLS (Row Level Security) for Supabase
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Note: Market data and candle_ticks are read-only for users
-- They can be populated by admin/scripts only
