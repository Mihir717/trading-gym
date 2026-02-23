require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Trust proxy for Railway/cloud deployments
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// CORS - allow all origins for testing
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/replay', require('./routes/replay'));
app.use('/api/trades', require('./routes/trades'));

// Health check
app.get('/health', async (req, res) => {
  const db = require('./db');
  let dbStatus = 'not configured';
  let dbError = null;

  if (db.isConnected()) {
    try {
      await db.query('SELECT 1');
      dbStatus = 'connected';
    } catch (err) {
      dbStatus = 'error';
      dbError = err.message;
    }
  }

  res.json({
    status: 'Trading Gym API is running!',
    database: dbStatus,
    dbError: dbError,
    environment: process.env.NODE_ENV || 'development',
    hasDbUrl: !!process.env.DATABASE_URL,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Keep server alive
server.on('error', (err) => {
  console.error('❌ Server error:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});