import useStore from '../store/useStore';

function MetricsPanel() {
  const balance = useStore((state) => state.balance);
  const openTrades = useStore((state) => state.openTrades);
  const closedTrades = useStore((state) => state.closedTrades);

  const safeBalance = Number(balance) || 0;
  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter((t) => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : 0;
  const totalPnL = closedTrades.reduce((sum, t) => sum + parseFloat(t.pnl || 0), 0);

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <h3 className="text-lg font-bold mb-4">Metrics</h3>

      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-text-secondary">Balance:</span>
          <span className="font-bold text-accent-green">${safeBalance.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-text-secondary">Total PnL:</span>
          <span className={`font-bold ${totalPnL >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            ${totalPnL.toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-text-secondary">Total Trades:</span>
          <span className="font-bold">{totalTrades}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-text-secondary">Win Rate:</span>
          <span className="font-bold">{winRate}%</span>
        </div>

        <div className="flex justify-between">
          <span className="text-text-secondary">Open Positions:</span>
          <span className="font-bold">{openTrades.length}</span>
        </div>
      </div>
    </div>
  );
}

export default MetricsPanel;