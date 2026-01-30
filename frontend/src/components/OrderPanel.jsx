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

  // FIXED VERSION
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
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <h3 className="text-lg font-bold mb-4">Place Order</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Current Price
          </label>
          <div className="text-2xl font-bold text-accent-green">
            ${safePrice.toFixed(2)}
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Position Size (BTC)
          </label>
          <input
            type="number"
            value={positionSize}
            onChange={(e) => setPositionSize(parseFloat(e.target.value))}
            step="0.01"
            min="0.01"
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded focus:outline-none focus:border-accent-green"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Stop Loss (Optional)
          </label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="Enter price"
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded focus:outline-none focus:border-accent-green"
          />
        </div>

        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Take Profit (Optional)
          </label>
          <input
            type="number"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="Enter price"
            className="w-full px-3 py-2 bg-bg-primary border border-border rounded focus:outline-none focus:border-accent-green"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleTrade('BUY')}
            disabled={loading || !safePrice}
            className="py-3 bg-accent-green hover:bg-accent-green/90 rounded font-medium disabled:opacity-50"
          >
            BUY
          </button>
          <button
            onClick={() => handleTrade('SELL')}
            disabled={loading || !safePrice}
            className="py-3 bg-accent-red hover:bg-accent-red/90 rounded font-medium disabled:opacity-50"
          >
            SELL
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderPanel;