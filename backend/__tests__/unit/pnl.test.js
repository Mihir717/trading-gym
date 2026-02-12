/**
 * Unit tests for P&L (Profit and Loss) calculations
 * These are pure function tests that don't require database or API calls
 */

describe('P&L Calculations', () => {
  // Helper functions that mirror the actual business logic
  const calculateBuyPnL = (exitPrice, entryPrice, positionSize) => {
    return (exitPrice - entryPrice) * positionSize;
  };

  const calculateSellPnL = (entryPrice, exitPrice, positionSize) => {
    return (entryPrice - exitPrice) * positionSize;
  };

  describe('BUY Trade P&L', () => {
    it('should calculate profit when price goes up', () => {
      const entryPrice = 50000;
      const exitPrice = 51000;
      const positionSize = 0.1;

      const pnl = calculateBuyPnL(exitPrice, entryPrice, positionSize);

      expect(pnl).toBe(100); // (51000 - 50000) * 0.1 = 100
    });

    it('should calculate loss when price goes down', () => {
      const entryPrice = 50000;
      const exitPrice = 49000;
      const positionSize = 0.1;

      const pnl = calculateBuyPnL(exitPrice, entryPrice, positionSize);

      expect(pnl).toBe(-100); // (49000 - 50000) * 0.1 = -100
    });

    it('should return zero when entry equals exit', () => {
      const entryPrice = 50000;
      const exitPrice = 50000;
      const positionSize = 0.1;

      const pnl = calculateBuyPnL(exitPrice, entryPrice, positionSize);

      expect(pnl).toBe(0);
    });

    it('should scale correctly with position size', () => {
      const entryPrice = 50000;
      const exitPrice = 51000;

      const pnlSmall = calculateBuyPnL(exitPrice, entryPrice, 0.1);
      const pnlLarge = calculateBuyPnL(exitPrice, entryPrice, 1.0);

      expect(pnlLarge).toBe(pnlSmall * 10);
    });

    it('should handle decimal prices correctly', () => {
      const entryPrice = 50000.50;
      const exitPrice = 50001.75;
      const positionSize = 0.1;

      const pnl = calculateBuyPnL(exitPrice, entryPrice, positionSize);

      expect(pnl).toBeCloseTo(0.125, 10); // (50001.75 - 50000.50) * 0.1 = 0.125
    });
  });

  describe('SELL Trade P&L', () => {
    it('should calculate profit when price goes down', () => {
      const entryPrice = 50000;
      const exitPrice = 49000;
      const positionSize = 0.1;

      const pnl = calculateSellPnL(entryPrice, exitPrice, positionSize);

      expect(pnl).toBe(100); // (50000 - 49000) * 0.1 = 100
    });

    it('should calculate loss when price goes up', () => {
      const entryPrice = 50000;
      const exitPrice = 51000;
      const positionSize = 0.1;

      const pnl = calculateSellPnL(entryPrice, exitPrice, positionSize);

      expect(pnl).toBe(-100); // (50000 - 51000) * 0.1 = -100
    });

    it('should return zero when entry equals exit', () => {
      const entryPrice = 50000;
      const exitPrice = 50000;
      const positionSize = 0.1;

      const pnl = calculateSellPnL(entryPrice, exitPrice, positionSize);

      expect(pnl).toBe(0);
    });

    it('should scale correctly with position size', () => {
      const entryPrice = 50000;
      const exitPrice = 49000;

      const pnlSmall = calculateSellPnL(entryPrice, exitPrice, 0.1);
      const pnlLarge = calculateSellPnL(entryPrice, exitPrice, 1.0);

      expect(pnlLarge).toBe(pnlSmall * 10);
    });
  });

  describe('BUY vs SELL symmetry', () => {
    it('should have opposite P&L for same price movement', () => {
      const entryPrice = 50000;
      const exitPrice = 51000;
      const positionSize = 0.1;

      const buyPnL = calculateBuyPnL(exitPrice, entryPrice, positionSize);
      const sellPnL = calculateSellPnL(entryPrice, exitPrice, positionSize);

      expect(buyPnL).toBe(-sellPnL); // BUY profits when SELL loses
    });
  });
});

describe('Stop Loss / Take Profit Logic', () => {
  // Helper function that mirrors checkAndExecuteSLTP logic
  const shouldTriggerSLTP = (trade, candle) => {
    const high = parseFloat(candle.high);
    const low = parseFloat(candle.low);
    const stopLoss = trade.stopLoss ? parseFloat(trade.stopLoss) : null;
    const takeProfit = trade.takeProfit ? parseFloat(trade.takeProfit) : null;

    if (trade.tradeType === 'BUY') {
      if (stopLoss && low <= stopLoss) {
        return { triggered: true, reason: 'Stop Loss', exitPrice: stopLoss };
      }
      if (takeProfit && high >= takeProfit) {
        return { triggered: true, reason: 'Take Profit', exitPrice: takeProfit };
      }
    } else { // SELL
      if (stopLoss && high >= stopLoss) {
        return { triggered: true, reason: 'Stop Loss', exitPrice: stopLoss };
      }
      if (takeProfit && low <= takeProfit) {
        return { triggered: true, reason: 'Take Profit', exitPrice: takeProfit };
      }
    }

    return { triggered: false };
  };

  describe('BUY Trade SL/TP', () => {
    it('should trigger stop loss when low touches SL', () => {
      const trade = { tradeType: 'BUY', stopLoss: 49000, takeProfit: 52000 };
      const candle = { high: 50500, low: 49000 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Stop Loss');
      expect(result.exitPrice).toBe(49000);
    });

    it('should trigger stop loss when low goes below SL', () => {
      const trade = { tradeType: 'BUY', stopLoss: 49000, takeProfit: 52000 };
      const candle = { high: 50500, low: 48500 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Stop Loss');
      expect(result.exitPrice).toBe(49000);
    });

    it('should trigger take profit when high touches TP', () => {
      const trade = { tradeType: 'BUY', stopLoss: 49000, takeProfit: 52000 };
      const candle = { high: 52000, low: 50500 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Take Profit');
      expect(result.exitPrice).toBe(52000);
    });

    it('should trigger take profit when high exceeds TP', () => {
      const trade = { tradeType: 'BUY', stopLoss: 49000, takeProfit: 52000 };
      const candle = { high: 53000, low: 50500 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Take Profit');
      expect(result.exitPrice).toBe(52000);
    });

    it('should not trigger when price stays between SL and TP', () => {
      const trade = { tradeType: 'BUY', stopLoss: 49000, takeProfit: 52000 };
      const candle = { high: 51000, low: 49500 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(false);
    });

    it('should prioritize stop loss when both SL and TP are hit', () => {
      const trade = { tradeType: 'BUY', stopLoss: 49000, takeProfit: 52000 };
      const candle = { high: 53000, low: 48000 }; // Massive candle hits both

      const result = shouldTriggerSLTP(trade, candle);

      // Based on the actual implementation, SL is checked first
      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Stop Loss');
    });
  });

  describe('SELL Trade SL/TP', () => {
    it('should trigger stop loss when high touches SL', () => {
      const trade = { tradeType: 'SELL', stopLoss: 51000, takeProfit: 48000 };
      const candle = { high: 51000, low: 49500 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Stop Loss');
      expect(result.exitPrice).toBe(51000);
    });

    it('should trigger stop loss when high exceeds SL', () => {
      const trade = { tradeType: 'SELL', stopLoss: 51000, takeProfit: 48000 };
      const candle = { high: 52000, low: 49500 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Stop Loss');
      expect(result.exitPrice).toBe(51000);
    });

    it('should trigger take profit when low touches TP', () => {
      const trade = { tradeType: 'SELL', stopLoss: 51000, takeProfit: 48000 };
      const candle = { high: 50000, low: 48000 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Take Profit');
      expect(result.exitPrice).toBe(48000);
    });

    it('should trigger take profit when low goes below TP', () => {
      const trade = { tradeType: 'SELL', stopLoss: 51000, takeProfit: 48000 };
      const candle = { high: 50000, low: 47000 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Take Profit');
      expect(result.exitPrice).toBe(48000);
    });

    it('should not trigger when price stays between SL and TP', () => {
      const trade = { tradeType: 'SELL', stopLoss: 51000, takeProfit: 48000 };
      const candle = { high: 50500, low: 48500 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle trades without stop loss', () => {
      const trade = { tradeType: 'BUY', stopLoss: null, takeProfit: 52000 };
      const candle = { high: 50500, low: 48000 }; // Would trigger SL if it existed

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(false);
    });

    it('should handle trades without take profit', () => {
      const trade = { tradeType: 'BUY', stopLoss: 49000, takeProfit: null };
      const candle = { high: 55000, low: 50000 }; // Would trigger TP if it existed

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(false);
    });

    it('should handle trades with neither SL nor TP', () => {
      const trade = { tradeType: 'BUY', stopLoss: null, takeProfit: null };
      const candle = { high: 55000, low: 45000 };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(false);
    });

    it('should handle string number inputs', () => {
      const trade = { tradeType: 'BUY', stopLoss: '49000', takeProfit: '52000' };
      const candle = { high: '52500', low: '50000' };

      const result = shouldTriggerSLTP(trade, candle);

      expect(result.triggered).toBe(true);
      expect(result.reason).toBe('Take Profit');
    });
  });
});
