import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useStore from '../store/useStore';

function EquityCurve() {
  const closedTrades = useStore((state) => state.closedTrades);
  const session = useStore((state) => state.session);

  const initialBalance = session?.initial_balance || 10000;

  // Build equity curve data
  const equityData = [];
  let runningBalance = initialBalance;

  equityData.push({
    trade: 0,
    balance: initialBalance,
  });

  closedTrades.forEach((trade, index) => {
    runningBalance += parseFloat(trade.pnl || 0);
    equityData.push({
      trade: index + 1,
      balance: runningBalance,
    });
  });

  if (equityData.length === 1) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border p-8 text-center">
        <p className="text-text-secondary">No trade data yet</p>
        <p className="text-text-secondary text-sm mt-2">
          Your equity curve will appear here after closing trades
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-6">
      <h3 className="text-xl font-bold mb-4">Equity Curve</h3>
      
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={equityData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            dataKey="trade" 
            stroke="#94a3b8"
            label={{ value: 'Trade Number', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
          />
          <YAxis 
            stroke="#94a3b8"
            label={{ value: 'Balance ($)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']}
            labelFormatter={(label) => `Trade #${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="balance" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <div className="text-text-secondary text-sm">Starting Balance</div>
          <div className="text-xl font-bold">${initialBalance.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-text-secondary text-sm">Current Balance</div>
          <div className="text-xl font-bold text-accent-green">
            ${runningBalance.toFixed(2)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-text-secondary text-sm">Total Return</div>
          <div className={`text-xl font-bold ${
            runningBalance >= initialBalance ? 'text-accent-green' : 'text-accent-red'
          }`}>
            {((runningBalance - initialBalance) / initialBalance * 100).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default EquityCurve;