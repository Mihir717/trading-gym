require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL not set - database features will not work');
}

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
}) : null;

if (pool) {
  pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
  });

  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
  });
}

module.exports = {
  query: (text, params) => {
    if (!pool) {
      return Promise.reject(new Error('Database not configured'));
    }
    return pool.query(text, params);
  },
  isConnected: () => !!pool,
};