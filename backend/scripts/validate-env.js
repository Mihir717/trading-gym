#!/usr/bin/env node

/**
 * Pre-deployment environment validation script.
 * Run this before deploying to verify all required configuration is in place.
 *
 * Usage: node scripts/validate-env.js
 */

require('dotenv').config();

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const recommended = [
  'FRONTEND_URL',
  'NODE_ENV',
];

let hasErrors = false;

console.log('=== Environment Validation ===\n');

// Check required variables
for (const key of required) {
  if (!process.env[key]) {
    console.error(`MISSING (required): ${key}`);
    hasErrors = true;
  } else {
    console.log(`  OK: ${key}`);
  }
}

// Check recommended variables
for (const key of recommended) {
  if (!process.env[key]) {
    console.warn(`  WARN (recommended): ${key} is not set`);
  } else {
    console.log(`  OK: ${key}`);
  }
}

// Validate JWT_SECRET strength
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('\n  WARN: JWT_SECRET is shorter than 32 characters. Use a stronger secret in production.');
}

// Validate DATABASE_URL format
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
  console.error('\n  ERROR: DATABASE_URL must start with postgresql:// or postgres://');
  hasErrors = true;
}

// Validate FRONTEND_URL format
if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('http')) {
  console.error('\n  ERROR: FRONTEND_URL must start with http:// or https://');
  hasErrors = true;
}

// Test database connectivity
console.log('\n=== Database Connectivity ===\n');

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT 1')
  .then(() => {
    console.log('  OK: Database connection successful');
    return pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
  })
  .then((result) => {
    const tables = result.rows.map(r => r.tablename);
    const expectedTables = ['users', 'sessions', 'trades', 'market_data', 'candle_ticks'];

    console.log('\n=== Schema Validation ===\n');
    for (const table of expectedTables) {
      if (tables.includes(table)) {
        console.log(`  OK: Table "${table}" exists`);
      } else {
        console.error(`  MISSING: Table "${table}" - run the schema.sql migration`);
        hasErrors = true;
      }
    }

    // Check for market data
    return pool.query('SELECT COUNT(*) as count FROM market_data');
  })
  .then((result) => {
    const count = parseInt(result.rows[0].count, 10);
    console.log(`\n=== Data Check ===\n`);
    if (count === 0) {
      console.warn('  WARN: No market data found. Run data fetching scripts after deployment.');
    } else {
      console.log(`  OK: ${count} market data rows found`);
    }
  })
  .catch((err) => {
    console.error(`  ERROR: Database connection failed - ${err.message}`);
    hasErrors = true;
  })
  .finally(() => {
    pool.end();
    console.log('\n================================');
    if (hasErrors) {
      console.error('RESULT: Validation FAILED. Fix the errors above before deploying.');
      process.exit(1);
    } else {
      console.log('RESULT: Validation PASSED. Ready to deploy.');
      process.exit(0);
    }
  });
