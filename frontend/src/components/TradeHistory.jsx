import useStore from '../store/useStore';
import { format } from 'date-fns';

function TradeHistory() {
  const closedTrades = useStore((state) => state.closedTrades);

  if (closedTrades.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border p-8 text-center">
        <p className="text-text-secondary">No closed trades yet</p>
        <p className="text-text-secondary text-sm mt-2">
          Start trading and your history will appear here
        </p>
      </div>
    );
  }

  const totalPnL = closedTrades.reduce((sum, trade) => sum + parseFloat(trade.pnl || 0), 0);
  const winningTrades = closedTrades.filter(t => parseFloat(t.pnl) > 0);
  const losingTrades = closedTrades.filter(t => parseFloat(t.pnl) < 0);
  const biggestWin = Math.max(...closedTrades.map(t => parseFloat(t.pnl || 0)));
  const biggestLoss = Math.min(...closedTrades.map(t => parseFloat(t.pnl || 0)));

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-bg-secondary rounded-lg border border-border p-4">
          <div className="text-text-secondary text-sm mb-1">Total Trades</div>
          <div className="text-2xl font-bold">{closedTrades.length}</div>
        </div>

        <div className="bg-bg-secondary rounded-lg border border-border p-4">
          <div className="text-text-secondary text-sm mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-accent-green">
            {((winningTrades.length / closedTrades.length) * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg border border-border p-4">
          <div className="text-text-secondary text-sm mb-1">Biggest Win</div>
          <div className="text-2xl font-bold text-accent-green">
            ${biggestWin.toFixed(2)}
          </div>
        </div>

        <div className="bg-bg-secondary rounded-lg border border-border p-4">
          <div className="text-text-secondary text-sm mb-1">Biggest Loss</div>
          <div className="text-2xl font-bold text-accent-red">
            ${biggestLoss.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Trade List */}
      <div className="bg-bg-secondary rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-bg-primary">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Entry</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Exit</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Size</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">PnL</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Exit Reason</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {closedTrades.slice().reverse().map((trade, index) => {
                const pnl = parseFloat(trade.pnl || 0);
                const isProfitable = pnl >= 0;

                return (
                  <tr key={index} className="hover:bg-bg-primary/50">
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        trade.trade_type === 'BUY' ? 'text-accent-green' : 'text-accent-red'
                      }`}>
                        {trade.trade_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      ${parseFloat(trade.entry_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      ${parseFloat(trade.exit_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {parseFloat(trade.position_size).toFixed(2)} BTC
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        isProfitable ? 'text-accent-green' : 'text-accent-red'
                      }`}>
                        ${pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {trade.exit_reason || 'Manual'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {trade.exit_time ? format(new Date(trade.exit_time), 'HH:mm:ss') : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TradeHistory;