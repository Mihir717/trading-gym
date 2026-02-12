import { useState } from 'react';
import { tradeAPI } from '../services/api';
import useStore from '../store/useStore';

function OrderPanel({ currentPrice = 0 }) {
  const session = useStore((state) => state.session);
  const addOpenTrade = useStore((state) => state.addOpenTrade);
  
  const [positionSize, setPositionSize] = useState(0.1);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [loading, setLoading] = useState(false);

  const safePrice = Number(currentPrice) || 0;

  const handleTrade = async (tradeType) => {
    if (!safePrice) return;
    
    setLoading(true);
    try {
      const response = await tradeAPI.open(
        session.sessionId,
        tradeType,
        safePrice,
        positionSize,
        stopLoss ? parseFloat(stopLoss) : null,
        takeProfit ? parseFloat(takeProfit) : null
      );
      
      addOpenTrade(response.data);
      
      setStopLoss('');
      setTakeProfit('');
    } catch (error) {
      console.error('Failed to open trade:', error);
      alert('Failed to open trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-purple-300 mb-1.5 font-medium">
          Position Size (BTC)
        </label>
        <input
          type="number"
          value={positionSize}
          onChange={(e) => setPositionSize(parseFloat(e.target.value))}
          step="0.01"
          min="0.01"
          className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500/50 text-white transition-all"
          style={{ fontSize: '0.875rem' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-purple-300 mb-1.5 font-medium">
            Stop Loss
          </label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500/50 text-white placeholder-gray-600 transition-all"
            style={{ fontSize: '0.875rem' }}
          />
        </div>

        <div>
          <label className="block text-xs text-purple-300 mb-1.5 font-medium">
            Take Profit
          </label>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 bg-purple-900/20 border border-purple-500/20 rounded-lg focus:outline-none focus:border-purple-500/50 text-white placeholder-gray-600 transition-all"
            style={{ fontSize: '0.875rem' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={() => handleTrade('BUY')}
          disabled={loading || !safePrice}
          className="py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-all shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontSize: '0.875rem'
          }}
        >
          BUY
        </button>
        <button
          onClick={() => handleTrade('SELL')}
          disabled={loading || !safePrice}
          className="py-2.5 rounded-lg font-semibold disabled:opacity-50 transition-all shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            fontSize: '0.875rem'
          }}
        >
          SELL
        </button>
      </div>
    </div>
  );
}

export default OrderPanel;