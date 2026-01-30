import { tradeAPI } from '../services/api';
import useStore from '../store/useStore';

function PositionsList({ currentPrice = 0 }) {
  const openTrades = useStore((state) => state.openTrades);
  const closeTrade = useStore((state) => state.closeTrade);

  // FIXED VERSION - convert to safe number
  const safePrice = Number(currentPrice) || 0;

  const handleClose = async (trade) => {
    try {
      const response = await tradeAPI.close(trade.id, safePrice);
      closeTrade(trade.id, response.data.pnl);
    } catch (error) {
      console.error('Failed to close trade:', error);
      alert('Failed to close trade');
    }
  };

  const calculatePnL = (trade) => {
    if (!safePrice) return 0;
    
    if (trade.trade_type === 'BUY') {
      return (safePrice - parseFloat(trade.entry_price)) * parseFloat(trade.position_size);
    } else {
      return (parseFloat(trade.entry_price) - safePrice) * parseFloat(trade.position_size);
    }
  };

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <h3 className="text-lg font-bold mb-4">Open Positions ({openTrades.length})</h3>

      <div className="space-y-2">
        {openTrades.length === 0 ? (
          <p className="text-text-secondary text-sm text-center py-4">
            No open positions
          </p>
        ) : (
          openTrades.map((trade) => {
            const pnl = calculatePnL(trade);
            const isProfitable = pnl >= 0;

            return (
              <div
                key={trade.id}
                className="bg-bg-primary rounded p-3 border border-border"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span
                      className={`font-bold ${
                        trade.trade_type === 'BUY' ? 'text-accent-green' : 'text-accent-red'
                      }`}
                    >
                      {trade.trade_type}
                    </span>
                    <span className="text-text-secondary text-sm ml-2">
                      {parseFloat(trade.position_size)} BTC
                    </span>
                  </div>
                  <button
                    onClick={() => handleClose(trade)}
                    className="text-xs px-2 py-1 bg-accent-red hover:bg-accent-red/90 rounded"
                  >
                    Close
                  </button>
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Entry:</span>
                    <span>${parseFloat(trade.entry_price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Current:</span>
                    <span>${safePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>PnL:</span>
                    <span className={isProfitable ? 'text-accent-green' : 'text-accent-red'}>
                      ${pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PositionsList;