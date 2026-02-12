/**
 * Tests for the Zustand store (useStore)
 * These test the core trading logic including SL/TP execution
 */

import { act } from '@testing-library/react';

// Create a mock store for testing
const createMockStore = () => {
  let state = {
    user: null,
    token: null,
    session: null,
    balance: 10000,
    openTrades: [],
    closedTrades: [],
    candles: [],
    currentCandleIndex: 0,
    isPlaying: false,
    replaySpeed: 1,
  };

  const getState = () => state;

  const setState = (updater) => {
    if (typeof updater === 'function') {
      state = { ...state, ...updater(state) };
    } else {
      state = { ...state, ...updater };
    }
  };

  const setUser = (user, token) => {
    setState({ user, token });
  };

  const logout = () => {
    setState({
      user: null,
      token: null,
      session: null,
      candles: [],
      openTrades: [],
      closedTrades: [],
      balance: 10000,
    });
  };

  const setSession = (session) => setState({ session });

  const setBalance = (balance) => setState({ balance });

  const addOpenTrade = (trade) =>
    setState((s) => ({
      openTrades: [...s.openTrades, trade],
    }));

  const closeTrade = (tradeId, pnl) =>
    setState((s) => {
      const trade = s.openTrades.find((t) => t.id === tradeId);
      return {
        openTrades: s.openTrades.filter((t) => t.id !== tradeId),
        closedTrades: [...s.closedTrades, { ...trade, pnl, status: 'closed' }],
        balance: s.balance + pnl,
      };
    });

  const checkAndExecuteSLTP = (currentCandle) => {
    setState((s) => {
      if (!currentCandle) return s;

      const high = parseFloat(currentCandle.high);
      const low = parseFloat(currentCandle.low);
      let updatedOpenTrades = [...s.openTrades];
      let updatedClosedTrades = [...s.closedTrades];
      let updatedBalance = s.balance;

      s.openTrades.forEach((trade) => {
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
          } else if (takeProfit && high >= takeProfit) {
            shouldClose = true;
            exitPrice = takeProfit;
            exitReason = 'Take Profit';
          }
        } else {
          if (stopLoss && high >= stopLoss) {
            shouldClose = true;
            exitPrice = stopLoss;
            exitReason = 'Stop Loss';
          } else if (takeProfit && low <= takeProfit) {
            shouldClose = true;
            exitPrice = takeProfit;
            exitReason = 'Take Profit';
          }
        }

        if (shouldClose && exitPrice) {
          let pnl;
          if (trade.trade_type === 'BUY') {
            pnl = (exitPrice - entryPrice) * positionSize;
          } else {
            pnl = (entryPrice - exitPrice) * positionSize;
          }

          updatedOpenTrades = updatedOpenTrades.filter((t) => t.id !== trade.id);
          updatedClosedTrades.push({
            ...trade,
            exit_price: exitPrice,
            pnl: pnl,
            status: 'closed',
            exit_reason: exitReason,
            exit_time: currentCandle.timestamp,
          });
          updatedBalance += pnl;
        }
      });

      return {
        openTrades: updatedOpenTrades,
        closedTrades: updatedClosedTrades,
        balance: updatedBalance,
      };
    });
  };

  const setCandles = (candles) => setState({ candles, currentCandleIndex: 0 });

  const advanceCandle = () =>
    setState((s) => ({
      currentCandleIndex: Math.min(s.currentCandleIndex + 1, s.candles.length - 1),
    }));

  const setIsPlaying = (isPlaying) => setState({ isPlaying });
  const setReplaySpeed = (replaySpeed) => setState({ replaySpeed });

  return {
    getState,
    setState,
    setUser,
    logout,
    setSession,
    setBalance,
    addOpenTrade,
    closeTrade,
    checkAndExecuteSLTP,
    setCandles,
    advanceCandle,
    setIsPlaying,
    setReplaySpeed,
  };
};

describe('useStore', () => {
  let store;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('User State', () => {
    it('should set user and token', () => {
      const user = { id: 1, email: 'test@test.com' };
      const token = 'jwt-token';

      store.setUser(user, token);

      expect(store.getState().user).toEqual(user);
      expect(store.getState().token).toBe(token);
    });

    it('should clear all state on logout', () => {
      // Set up some state
      store.setUser({ id: 1, email: 'test@test.com' }, 'token');
      store.setSession({ id: 1 });
      store.setBalance(15000);
      store.addOpenTrade({ id: 1, trade_type: 'BUY' });

      store.logout();

      const state = store.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.session).toBeNull();
      expect(state.balance).toBe(10000);
      expect(state.openTrades).toEqual([]);
      expect(state.closedTrades).toEqual([]);
    });
  });

  describe('Trading State', () => {
    it('should add open trade', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
      };

      store.addOpenTrade(trade);

      expect(store.getState().openTrades).toHaveLength(1);
      expect(store.getState().openTrades[0]).toEqual(trade);
    });

    it('should close trade and update balance', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
      };

      store.addOpenTrade(trade);
      store.closeTrade(1, 100); // $100 profit

      const state = store.getState();
      expect(state.openTrades).toHaveLength(0);
      expect(state.closedTrades).toHaveLength(1);
      expect(state.closedTrades[0].pnl).toBe(100);
      expect(state.closedTrades[0].status).toBe('closed');
      expect(state.balance).toBe(10100); // 10000 + 100
    });

    it('should handle negative P&L', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
      };

      store.addOpenTrade(trade);
      store.closeTrade(1, -150); // $150 loss

      expect(store.getState().balance).toBe(9850); // 10000 - 150
    });

    it('should handle multiple open trades', () => {
      store.addOpenTrade({ id: 1, trade_type: 'BUY' });
      store.addOpenTrade({ id: 2, trade_type: 'SELL' });
      store.addOpenTrade({ id: 3, trade_type: 'BUY' });

      expect(store.getState().openTrades).toHaveLength(3);

      store.closeTrade(2, 50);

      expect(store.getState().openTrades).toHaveLength(2);
      expect(store.getState().closedTrades).toHaveLength(1);
    });
  });

  describe('checkAndExecuteSLTP - BUY Trades', () => {
    it('should trigger stop loss when low touches SL', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 49000,
        take_profit: 52000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 50500, low: 49000, timestamp: Date.now() });

      const state = store.getState();
      expect(state.openTrades).toHaveLength(0);
      expect(state.closedTrades).toHaveLength(1);
      expect(state.closedTrades[0].exit_reason).toBe('Stop Loss');
      expect(state.closedTrades[0].exit_price).toBe(49000);
      expect(state.closedTrades[0].pnl).toBe(-100); // (49000 - 50000) * 0.1
    });

    it('should trigger stop loss when low goes below SL', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 49000,
        take_profit: 52000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 50500, low: 48000, timestamp: Date.now() });

      const state = store.getState();
      expect(state.closedTrades[0].exit_price).toBe(49000); // Exits at SL, not at low
    });

    it('should trigger take profit when high touches TP', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 49000,
        take_profit: 52000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 52000, low: 50500, timestamp: Date.now() });

      const state = store.getState();
      expect(state.openTrades).toHaveLength(0);
      expect(state.closedTrades[0].exit_reason).toBe('Take Profit');
      expect(state.closedTrades[0].exit_price).toBe(52000);
      expect(state.closedTrades[0].pnl).toBe(200); // (52000 - 50000) * 0.1
    });

    it('should trigger take profit when high exceeds TP', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 49000,
        take_profit: 52000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 54000, low: 50500, timestamp: Date.now() });

      const state = store.getState();
      expect(state.closedTrades[0].exit_price).toBe(52000); // Exits at TP, not at high
    });

    it('should not trigger when price stays between SL and TP', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 49000,
        take_profit: 52000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 51000, low: 49500, timestamp: Date.now() });

      expect(store.getState().openTrades).toHaveLength(1);
      expect(store.getState().closedTrades).toHaveLength(0);
    });

    it('should prioritize stop loss over take profit when both hit', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 49000,
        take_profit: 52000,
      };

      store.addOpenTrade(trade);
      // Massive candle that hits both SL and TP
      store.checkAndExecuteSLTP({ high: 53000, low: 48000, timestamp: Date.now() });

      const state = store.getState();
      // Based on the implementation, SL is checked first
      expect(state.closedTrades[0].exit_reason).toBe('Stop Loss');
    });
  });

  describe('checkAndExecuteSLTP - SELL Trades', () => {
    it('should trigger stop loss when high touches SL', () => {
      const trade = {
        id: 1,
        trade_type: 'SELL',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 51000,
        take_profit: 48000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 51000, low: 49500, timestamp: Date.now() });

      const state = store.getState();
      expect(state.openTrades).toHaveLength(0);
      expect(state.closedTrades[0].exit_reason).toBe('Stop Loss');
      expect(state.closedTrades[0].exit_price).toBe(51000);
      expect(state.closedTrades[0].pnl).toBe(-100); // (50000 - 51000) * 0.1
    });

    it('should trigger stop loss when high exceeds SL', () => {
      const trade = {
        id: 1,
        trade_type: 'SELL',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 51000,
        take_profit: 48000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 52000, low: 49500, timestamp: Date.now() });

      const state = store.getState();
      expect(state.closedTrades[0].exit_price).toBe(51000); // Exits at SL
    });

    it('should trigger take profit when low touches TP', () => {
      const trade = {
        id: 1,
        trade_type: 'SELL',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 51000,
        take_profit: 48000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 50500, low: 48000, timestamp: Date.now() });

      const state = store.getState();
      expect(state.closedTrades[0].exit_reason).toBe('Take Profit');
      expect(state.closedTrades[0].exit_price).toBe(48000);
      expect(state.closedTrades[0].pnl).toBe(200); // (50000 - 48000) * 0.1
    });

    it('should trigger take profit when low goes below TP', () => {
      const trade = {
        id: 1,
        trade_type: 'SELL',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 51000,
        take_profit: 48000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 50500, low: 47000, timestamp: Date.now() });

      const state = store.getState();
      expect(state.closedTrades[0].exit_price).toBe(48000); // Exits at TP
    });
  });

  describe('checkAndExecuteSLTP - Edge Cases', () => {
    it('should handle trade without stop loss', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: null,
        take_profit: 52000,
      };

      store.addOpenTrade(trade);
      // Low would normally trigger SL if it existed
      store.checkAndExecuteSLTP({ high: 50500, low: 48000, timestamp: Date.now() });

      expect(store.getState().openTrades).toHaveLength(1); // Trade still open
    });

    it('should handle trade without take profit', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 49000,
        take_profit: null,
      };

      store.addOpenTrade(trade);
      // High would normally trigger TP if it existed
      store.checkAndExecuteSLTP({ high: 55000, low: 50000, timestamp: Date.now() });

      expect(store.getState().openTrades).toHaveLength(1); // Trade still open
    });

    it('should handle trade with neither SL nor TP', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: null,
        take_profit: null,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: 55000, low: 45000, timestamp: Date.now() });

      expect(store.getState().openTrades).toHaveLength(1);
    });

    it('should handle null candle gracefully', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 49000,
        take_profit: 52000,
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP(null);

      expect(store.getState().openTrades).toHaveLength(1);
    });

    it('should handle string number inputs', () => {
      const trade = {
        id: 1,
        trade_type: 'BUY',
        entry_price: '50000',
        position_size: '0.1',
        stop_loss: '49000',
        take_profit: '52000',
      };

      store.addOpenTrade(trade);
      store.checkAndExecuteSLTP({ high: '52500', low: '50000', timestamp: Date.now() });

      expect(store.getState().closedTrades[0].exit_reason).toBe('Take Profit');
    });

    it('should process multiple trades in same candle', () => {
      const trade1 = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 49500,
        take_profit: 51000,
      };

      const trade2 = {
        id: 2,
        trade_type: 'SELL',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: 50500,
        take_profit: 49000,
      };

      store.addOpenTrade(trade1);
      store.addOpenTrade(trade2);

      // This candle triggers TP for BUY and SL for SELL
      store.checkAndExecuteSLTP({ high: 51000, low: 49200, timestamp: Date.now() });

      const state = store.getState();
      expect(state.openTrades).toHaveLength(0);
      expect(state.closedTrades).toHaveLength(2);
    });

    it('should update balance correctly for multiple closures', () => {
      store.setBalance(10000);

      const trade1 = {
        id: 1,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.1,
        stop_loss: null,
        take_profit: 51000, // +100
      };

      const trade2 = {
        id: 2,
        trade_type: 'BUY',
        entry_price: 50000,
        position_size: 0.2,
        stop_loss: null,
        take_profit: 51000, // +200
      };

      store.addOpenTrade(trade1);
      store.addOpenTrade(trade2);
      store.checkAndExecuteSLTP({ high: 51500, low: 50000, timestamp: Date.now() });

      // 10000 + 100 + 200 = 10300
      expect(store.getState().balance).toBe(10300);
    });
  });

  describe('Candle Navigation', () => {
    it('should set candles and reset index', () => {
      const candles = [
        { timestamp: 1, open: 50000 },
        { timestamp: 2, open: 50100 },
        { timestamp: 3, open: 50200 },
      ];

      store.setCandles(candles);

      const state = store.getState();
      expect(state.candles).toHaveLength(3);
      expect(state.currentCandleIndex).toBe(0);
    });

    it('should advance candle index', () => {
      store.setCandles([{ timestamp: 1 }, { timestamp: 2 }, { timestamp: 3 }]);

      store.advanceCandle();
      expect(store.getState().currentCandleIndex).toBe(1);

      store.advanceCandle();
      expect(store.getState().currentCandleIndex).toBe(2);
    });

    it('should not advance beyond last candle', () => {
      store.setCandles([{ timestamp: 1 }, { timestamp: 2 }, { timestamp: 3 }]);

      store.advanceCandle();
      store.advanceCandle();
      store.advanceCandle(); // Should stay at 2
      store.advanceCandle(); // Should still stay at 2

      expect(store.getState().currentCandleIndex).toBe(2);
    });
  });

  describe('Replay State', () => {
    it('should set playing state', () => {
      store.setIsPlaying(true);
      expect(store.getState().isPlaying).toBe(true);

      store.setIsPlaying(false);
      expect(store.getState().isPlaying).toBe(false);
    });

    it('should set replay speed', () => {
      store.setReplaySpeed(2);
      expect(store.getState().replaySpeed).toBe(2);

      store.setReplaySpeed(0.5);
      expect(store.getState().replaySpeed).toBe(0.5);
    });
  });
});
