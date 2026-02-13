require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db');

const app = express();

// Trust proxy for Railway/cloud deployments
app.set('trust proxy', 1);

// Middleware
app.use(helmet());

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Simple in-memory rate limiting for API endpoints
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100; // requests per window

function rateLimit(req, res, next) {
  const key = req.ip;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(key, { windowStart: now, count: 1 });
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

// Clean up rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

app.use('/api', rateLimit);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/replay', require('./routes/replay'));
app.use('/api/trades', require('./routes/trades'));

// Health check with database connectivity verification
app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'degraded', database: 'disconnected', error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Keep server alive
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    db.pool.end(() => {
      console.log('Database pool closed.');
      process.exit(0);
    });
  });

  // Force exit after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
