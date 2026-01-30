import { create } from 'zustand';

const useStore = create((set) => ({
  // User state
  user: null,
  token: localStorage.getItem('token'),
  
  setUser: (user, token) => {
    if (token) localStorage.setItem('token', token);
    set({ user, token });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, session: null, candles: [], openTrades: [], closedTrades: [], balance: 10000 });
  },
  
  // Session state
  session: null,
  setSession: (session) => set({ session }),
  
  // Trading state
  balance: 10000,
  openTrades: [],
  closedTrades: [],
  
  setBalance: (balance) => set({ balance }),
  
  addOpenTrade: (trade) => set((state) => ({
    openTrades: [...state.openTrades, trade]
  })),
  
  closeTrade: (tradeId, pnl) => set((state) => {
    const trade = state.openTrades.find(t => t.id === tradeId);
    return {
      openTrades: state.openTrades.filter(t => t.id !== tradeId),
      closedTrades: [...state.closedTrades, { ...trade, pnl, status: 'closed' }],
      balance: state.balance + pnl
    };
  }),

  checkAndExecuteSLTP: (currentCandle) => set((state) => {
    if (!currentCandle) return state;

    const high = parseFloat(currentCandle.high);
    const low = parseFloat(currentCandle.low);
    let updatedOpenTrades = [...state.openTrades];
    let updatedClosedTrades = [...state.closedTrades];
    let updatedBalance = state.balance;

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

    return {
      openTrades: updatedOpenTrades,
      closedTrades: updatedClosedTrades,
      balance: updatedBalance
    };
  }),
  
  // Candles state
  candles: [],
  currentCandleIndex: 0,
  
  setCandles: (candles) => set({ candles, currentCandleIndex: 0 }),
  
  advanceCandle: () => set((state) => ({
    currentCandleIndex: Math.min(state.currentCandleIndex + 1, state.candles.length - 1)
  })),
  
  // Replay state
  isPlaying: false,
  replaySpeed: 1,
  
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setReplaySpeed: (replaySpeed) => set({ replaySpeed }),
}));

export default useStore;