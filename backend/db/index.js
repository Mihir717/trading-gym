require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};