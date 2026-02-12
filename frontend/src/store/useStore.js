import { create } from 'zustand';

// Session state keys for localStorage
const SESSION_STORAGE_KEY = 'trading_gym_session_state';

// Asset configuration - pricing, decimals, pip values
export const ASSET_CONFIG = {
  // Crypto
  BTCUSDT: { name: 'Bitcoin', category: 'crypto', decimals: 2, pipValue: 0.01, icon: '₿', color: '#F7931A' },
  ETHUSDT: { name: 'Ethereum', category: 'crypto', decimals: 2, pipValue: 0.01, icon: 'Ξ', color: '#627EEA' },
  SOLUSDT: { name: 'Solana', category: 'crypto', decimals: 2, pipValue: 0.01, icon: '◎', color: '#9945FF' },

  // Commodities
  XAUUSD: { name: 'Gold', category: 'commodities', decimals: 2, pipValue: 0.01, icon: '🥇', color: '#FFD700' },
  XAGUSD: { name: 'Silver', category: 'commodities', decimals: 3, pipValue: 0.001, icon: '🥈', color: '#C0C0C0' },
  WTIUSD: { name: 'Oil (WTI)', category: 'commodities', decimals: 2, pipValue: 0.01, icon: '🛢️', color: '#4A4A4A' },

  // Forex
  EURUSD: { name: 'EUR/USD', category: 'forex', decimals: 5, pipValue: 0.0001, icon: '€', color: '#003399' },
  GBPUSD: { name: 'GBP/USD', category: 'forex', decimals: 5, pipValue: 0.0001, icon: '£', color: '#C8102E' },
  USDJPY: { name: 'USD/JPY', category: 'forex', decimals: 3, pipValue: 0.01, icon: '¥', color: '#BC002D' },
  AUDUSD: { name: 'AUD/USD', category: 'forex', decimals: 5, pipValue: 0.0001, icon: 'A$', color: '#00843D' },
  USDCAD: { name: 'USD/CAD', category: 'forex', decimals: 5, pipValue: 0.0001, icon: 'C$', color: '#FF0000' },
  USDCHF: { name: 'USD/CHF', category: 'forex', decimals: 5, pipValue: 0.0001, icon: 'Fr', color: '#FF0000' },
};

// Helper to get asset configuration
export const getAssetConfig = (symbol) => {
  return ASSET_CONFIG[symbol] || {
    name: symbol,
    category: 'unknown',
    decimals: 2,
    pipValue: 0.01,
    icon: '?',
    color: '#888888'
  };
};

// Helper to format price based on asset
export const formatPrice = (price, symbol) => {
  const config = getAssetConfig(symbol);
  return Number(price).toFixed(config.decimals);
};

// Helper to calculate pip value for position sizing
export const calculatePipValue = (symbol, lotSize = 1) => {
  const config = getAssetConfig(symbol);
  // Standard lot calculations vary by asset type
  if (config.category === 'forex') {
    return config.pipValue * 100000 * lotSize; // Standard forex lot = 100,000 units
  } else if (config.category === 'commodities') {
    return config.pipValue * 100 * lotSize; // Commodities vary
  } else {
    return config.pipValue * lotSize; // Crypto - direct
  }
};

// Helper to save session state to localStorage
const saveSessionState = (state) => {
  try {
    const sessionState = {
      session: state.session,
      balance: state.balance,
      openTrades: state.openTrades,
      closedTrades: state.closedTrades,
      currentCandleIndex: state.currentCandleIndex,
      currentTickIndex: state.currentTickIndex,
      progressiveMode: state.progressiveMode,
      replaySpeed: state.replaySpeed,
      savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionState));
  } catch (e) {
    console.error('Failed to save session state:', e);
  }
};

// Helper to load session state from localStorage
const loadSessionState = () => {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only restore if saved within last 24 hours
      if (parsed.savedAt && Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load session state:', e);
  }
  return null;
};

// Helper to clear session state from localStorage
const clearSessionState = () => {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear session state:', e);
  }
};

// Load initial state
const savedState = loadSessionState();

const useStore = create((set, get) => ({
  // User state
  user: null,
  token: localStorage.getItem('token'),

  setUser: (user, token) => {
    if (token) localStorage.setItem('token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    clearSessionState();
    set({
      user: null,
      token: null,
      session: null,
      candles: [],
      candlesWithTicks: [],
      openTrades: [],
      closedTrades: [],
      balance: 10000,
      currentCandleIndex: 0,
      currentTickIndex: 0,
      progressiveMode: true,
    });
  },

  // Session state - restore from localStorage if available
  session: savedState?.session || null,
  setSession: (session) => {
    set({ session });
    // Save immediately when session is set
    setTimeout(() => saveSessionState(get()), 0);
  },

  // Trading state - restore from localStorage if available
  balance: savedState?.balance || 10000,
  openTrades: savedState?.openTrades || [],
  closedTrades: savedState?.closedTrades || [],

  setBalance: (balance) => {
    set({ balance });
    saveSessionState(get());
  },

  addOpenTrade: (trade) => set((state) => {
    const newState = {
      openTrades: [...state.openTrades, trade]
    };
    setTimeout(() => saveSessionState(get()), 0);
    return newState;
  }),

  closeTrade: (tradeId, pnl) => set((state) => {
    const trade = state.openTrades.find(t => t.id === tradeId);
    const newState = {
      openTrades: state.openTrades.filter(t => t.id !== tradeId),
      closedTrades: [...state.closedTrades, { ...trade, pnl, status: 'closed' }],
      balance: state.balance + pnl
    };
    setTimeout(() => saveSessionState(get()), 0);
    return newState;
  }),

  // Check SL/TP against current price (works with ticks or candles)
  checkAndExecuteSLTP: (currentCandle) => set((state) => {
    if (!currentCandle) return state;

    const high = parseFloat(currentCandle.high || currentCandle.runningHigh || 0);
    const low = parseFloat(currentCandle.low || currentCandle.runningLow || 0);
    let updatedOpenTrades = [...state.openTrades];
    let updatedClosedTrades = [...state.closedTrades];
    let updatedBalance = state.balance;
    let hasChanges = false;

    state.openTrades.forEach((trade) => {
      const entryPrice = parseFloat(trade.entry_price);
      const positionSize = parseFloat(trade.position_size);
      const stopLoss = trade.stop_loss ? parseFloat(trade.stop_loss) : null;
      const takeProfit = trade.take_profit ? parseFloat(trade.take_profit) : null;

      let shouldClose = false;
      let exitPrice = null;
      let exitReason = '';

      if (trade.trade_type === 'BUY') {
        if (stopLoss && low <= stopLoss) {
          shouldClose = true;
          exitPrice = stopLoss;
          exitReason = 'Stop Loss';
        }
        else if (takeProfit && high >= takeProfit) {
          shouldClose = true;
          exitPrice = takeProfit;
          exitReason = 'Take Profit';
        }
      } else {
        if (stopLoss && high >= stopLoss) {
          shouldClose = true;
          exitPrice = stopLoss;
          exitReason = 'Stop Loss';
        }
        else if (takeProfit && low <= takeProfit) {
          shouldClose = true;
          exitPrice = takeProfit;
          exitReason = 'Take Profit';
        }
      }

      if (shouldClose && exitPrice) {
        hasChanges = true;
        let pnl;
        if (trade.trade_type === 'BUY') {
          pnl = (exitPrice - entryPrice) * positionSize;
        } else {
          pnl = (entryPrice - exitPrice) * positionSize;
        }

        updatedOpenTrades = updatedOpenTrades.filter(t => t.id !== trade.id);

        updatedClosedTrades.push({
          ...trade,
          exit_price: exitPrice,
          pnl: pnl,
          status: 'closed',
          exit_reason: exitReason,
          exit_time: currentCandle.timestamp
        });

        updatedBalance += pnl;
      }
    });

    if (hasChanges) {
      setTimeout(() => saveSessionState(get()), 0);
    }

    return {
      openTrades: updatedOpenTrades,
      closedTrades: updatedClosedTrades,
      balance: updatedBalance
    };
  }),

  // Candles state (basic mode - full candles)
  candles: [],
  currentCandleIndex: savedState?.currentCandleIndex || 0,

  setCandles: (candles) => set({ candles, currentCandleIndex: 0 }),

  advanceCandle: () => set((state) => {
    const newIndex = Math.min(state.currentCandleIndex + 1, state.candles.length - 1);
    // Save periodically (every 10 candles)
    if (newIndex % 10 === 0) {
      setTimeout(() => saveSessionState(get()), 0);
    }
    return { currentCandleIndex: newIndex };
  }),

  // Progressive candle formation state
  candlesWithTicks: [], // Candles with their tick data
  currentTickIndex: savedState?.currentTickIndex || 0, // Current tick within current candle
  progressiveMode: savedState?.progressiveMode ?? true, // Toggle between progressive and instant mode

  setCandlesWithTicks: (candlesWithTicks) => set((state) => {
    // If we have a saved position, try to restore it
    const savedIndex = savedState?.currentCandleIndex || 0;
    const savedTickIndex = savedState?.currentTickIndex || 0;

    // Validate saved indices
    const validCandleIndex = Math.min(savedIndex, candlesWithTicks.length - 1);
    const validTickIndex = candlesWithTicks[validCandleIndex]?.ticks?.length
      ? Math.min(savedTickIndex, candlesWithTicks[validCandleIndex].ticks.length - 1)
      : 0;

    return {
      candlesWithTicks,
      currentCandleIndex: validCandleIndex,
      currentTickIndex: validTickIndex
    };
  }),

  setProgressiveMode: (progressiveMode) => {
    set({ progressiveMode });
    saveSessionState(get());
  },

  // Advance to next tick (for progressive candle formation)
  advanceTick: () => set((state) => {
    const { candlesWithTicks, currentCandleIndex, currentTickIndex } = state;

    if (candlesWithTicks.length === 0) return state;

    const currentCandle = candlesWithTicks[currentCandleIndex];
    if (!currentCandle) return state;

    const tickCount = currentCandle.ticks?.length || 0;

    // If we have ticks and haven't reached the last tick
    if (tickCount > 0 && currentTickIndex < tickCount - 1) {
      return { currentTickIndex: currentTickIndex + 1 };
    }

    // Move to next candle
    if (currentCandleIndex < candlesWithTicks.length - 1) {
      const newCandleIndex = currentCandleIndex + 1;
      // Save periodically (every 5 candles)
      if (newCandleIndex % 5 === 0) {
        setTimeout(() => saveSessionState(get()), 0);
      }
      return {
        currentCandleIndex: newCandleIndex,
        currentTickIndex: 0
      };
    }

    // Already at the end
    return state;
  }),

  // Get current forming candle data (with running OHLC from ticks)
  getCurrentFormingCandle: () => {
    const state = get();
    const { candlesWithTicks, currentCandleIndex, currentTickIndex, progressiveMode } = state;

    if (candlesWithTicks.length === 0) return null;

    const currentCandle = candlesWithTicks[currentCandleIndex];
    if (!currentCandle) return null;

    // If not in progressive mode or no ticks, return full candle
    if (!progressiveMode || !currentCandle.ticks || currentCandle.ticks.length === 0) {
      return {
        timestamp: currentCandle.timestamp,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
        volume: currentCandle.volume,
        isComplete: true
      };
    }

    // Get current tick data for forming candle
    const currentTick = currentCandle.ticks[currentTickIndex];
    if (!currentTick) {
      return {
        timestamp: currentCandle.timestamp,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
        volume: currentCandle.volume,
        isComplete: true
      };
    }

    return {
      timestamp: currentCandle.timestamp,
      open: currentTick.runningOpen,
      high: currentTick.runningHigh,
      low: currentTick.runningLow,
      close: currentTick.runningClose,
      volume: currentCandle.volume,
      isComplete: currentTick.isFinalTick,
      tickProgress: (currentTickIndex + 1) / currentCandle.ticks.length
    };
  },

  // Get all visible candles up to current position (for chart rendering)
  getVisibleCandles: () => {
    const state = get();
    const { candlesWithTicks, currentCandleIndex, currentTickIndex, progressiveMode } = state;

    if (candlesWithTicks.length === 0) return [];

    // All completed candles before current
    const completedCandles = candlesWithTicks.slice(0, currentCandleIndex).map(candle => ({
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));

    // Current forming candle
    const currentCandle = candlesWithTicks[currentCandleIndex];
    if (!currentCandle) return completedCandles;

    let formingCandle;

    if (!progressiveMode || !currentCandle.ticks || currentCandle.ticks.length === 0) {
      formingCandle = {
        timestamp: currentCandle.timestamp,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
        volume: currentCandle.volume
      };
    } else {
      const currentTick = currentCandle.ticks[currentTickIndex];
      if (currentTick) {
        formingCandle = {
          timestamp: currentCandle.timestamp,
          open: currentTick.runningOpen,
          high: currentTick.runningHigh,
          low: currentTick.runningLow,
          close: currentTick.runningClose,
          volume: currentCandle.volume
        };
      } else {
        formingCandle = {
          timestamp: currentCandle.timestamp,
          open: currentCandle.open,
          high: currentCandle.high,
          low: currentCandle.low,
          close: currentCandle.close,
          volume: currentCandle.volume
        };
      }
    }

    return [...completedCandles, formingCandle];
  },

  // Get current price (close of forming candle)
  getCurrentPrice: () => {
    const formingCandle = get().getCurrentFormingCandle();
    return formingCandle ? formingCandle.close : 0;
  },

  // Replay state
  isPlaying: false,
  replaySpeed: savedState?.replaySpeed || 1,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setReplaySpeed: (replaySpeed) => {
    set({ replaySpeed });
    saveSessionState(get());
  },

  // Session management
  hasActiveSession: () => {
    const state = get();
    return state.session !== null && state.token !== null;
  },

  clearSession: () => {
    clearSessionState();
    set({
      session: null,
      candles: [],
      candlesWithTicks: [],
      openTrades: [],
      closedTrades: [],
      balance: 10000,
      currentCandleIndex: 0,
      currentTickIndex: 0,
      isPlaying: false,
    });
  },

  // Manual save (for explicit save points)
  saveSession: () => {
    saveSessionState(get());
  },
}));

export default useStore;
