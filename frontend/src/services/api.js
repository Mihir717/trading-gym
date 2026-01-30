import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

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
  start: (asset, timeframe, initialBalance) =>
    api.post('/sessions/start', { asset, timeframe, initialBalance }),
  
  get: (sessionId) =>
    api.get(`/sessions/${sessionId}`),
};

export const replayAPI = {
  getCandles: (sessionId, offset = 0, limit = 100) =>
    api.get('/replay/candles', { params: { sessionId, offset, limit } }),
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