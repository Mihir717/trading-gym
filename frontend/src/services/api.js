import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (email, password) =>
    api.post('/auth/register', { email, password }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),
};

export const sessionAPI = {
  start: (asset, timeframe, initialBalance, startDate = null) =>
    api.post('/sessions/start', { asset, timeframe, initialBalance, startDate }),

  get: (sessionId) =>
    api.get(`/sessions/${sessionId}`),
};

export const replayAPI = {
  getCandles: (sessionId, offset = 0, limit = 100) =>
    api.get('/replay/candles', { params: { sessionId, offset, limit } }),

  getTicks: (sessionId, offset = 0, limit = 100) =>
    api.get('/replay/ticks', { params: { sessionId, offset, limit } }),

  getCandlesWithTicks: (sessionId, offset = 0, limit = 100) =>
    api.get('/replay/candles-with-ticks', { params: { sessionId, offset, limit } }),

  // Get date range for available historical data
  getDateRange: (asset = 'BTCUSDT', timeframe = '1d') =>
    api.get('/replay/date-range', { params: { asset, timeframe } }),

  // Get all available timeframes and their data ranges
  getAvailableData: (asset = 'BTCUSDT') =>
    api.get('/replay/available-data', { params: { asset } }),
};

export const tradeAPI = {
  open: (sessionId, tradeType, entryPrice, positionSize, stopLoss, takeProfit) =>
    api.post('/trades/open', { sessionId, tradeType, entryPrice, positionSize, stopLoss, takeProfit }),

  close: (tradeId, exitPrice) =>
    api.put(`/trades/${tradeId}/close`, { exitPrice }),

  getSessionTrades: (sessionId) =>
    api.get(`/trades/session/${sessionId}`),
};

export default api;
