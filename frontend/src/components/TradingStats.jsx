import { useMemo } from 'react';
import useStore from '../store/useStore';
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart2,
  Activity,
  Award,
  AlertTriangle,
  Percent,
  DollarSign
} from 'lucide-react';

function TradingStats() {
  const closedTrades = useStore((state) => state.closedTrades);
  const session = useStore((state) => state.session);
  const balance = useStore((state) => state.balance);

  const stats = useMemo(() => {
    if (closedTrades.length === 0) {
      return null;
    }

    const initialBalance = session?.initial_balance || session?.initialBalance || 10000;

    // Basic stats
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => parseFloat(t.pnl) > 0);
    const losingTrades = closedTrades.filter(t => parseFloat(t.pnl) < 0);
    const breakEvenTrades = closedTrades.filter(t => parseFloat(t.pnl) === 0);

    const winRate = (winningTrades.length / totalTrades) * 100;

    // PnL calculations
    const totalPnL = closedTrades.reduce((sum, t) => sum + parseFloat(t.pnl || 0), 0);
    const totalReturn = ((balance - initialBalance) / initialBalance) * 100;

    // Average win/loss
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0) / losingTrades.length)
      : 0;

    // Risk/Reward ratio
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    // Profit factor
    const grossProfit = winningTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + parseFloat(t.pnl), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Max drawdown calculation
    let peak = initialBalance;
    let maxDrawdown = 0;
    let runningBalance = initialBalance;
    const equityCurve = [initialBalance];

    closedTrades.forEach(trade => {
      runningBalance += parseFloat(trade.pnl || 0);
      equityCurve.push(runningBalance);

      if (runningBalance > peak) {
        peak = runningBalance;
      }

      const drawdown = ((peak - runningBalance) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Sharpe Ratio (simplified - using daily returns assumption)
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i-1]) / equityCurve[i-1]);
    }

    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdDev = returns.length > 1
      ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1))
      : 0;
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    // Best and worst trades
    const bestTrade = Math.max(...closedTrades.map(t => parseFloat(t.pnl)));
    const worstTrade = Math.min(...closedTrades.map(t => parseFloat(t.pnl)));

    // Consecutive wins/losses
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;

    closedTrades.forEach(trade => {
      const pnl = parseFloat(trade.pnl);
      if (pnl > 0) {
        tempWinStreak++;
        tempLossStreak = 0;
        if (tempWinStreak > maxWinStreak) maxWinStreak = tempWinStreak;
      } else if (pnl < 0) {
        tempLossStreak++;
        tempWinStreak = 0;
        if (tempLossStreak > maxLossStreak) maxLossStreak = tempLossStreak;
      }
    });

    // Current streak
    for (let i = closedTrades.length - 1; i >= 0; i--) {
      const pnl = parseFloat(closedTrades[i].pnl);
      if (i === closedTrades.length - 1) {
        currentStreak = pnl > 0 ? 1 : pnl < 0 ? -1 : 0;
      } else {
        const prevPnl = parseFloat(closedTrades[i + 1].pnl);
        if ((pnl > 0 && prevPnl > 0) || (pnl < 0 && prevPnl < 0)) {
          currentStreak += pnl > 0 ? 1 : -1;
        } else {
          break;
        }
      }
    }

    // Expectancy
    const expectancy = (winRate / 100 * avgWin) - ((100 - winRate) / 100 * avgLoss);

    return {
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      breakEvenTrades: breakEvenTrades.length,
      winRate,
      totalPnL,
      totalReturn,
      avgWin,
      avgLoss,
      riskRewardRatio,
      profitFactor,
      maxDrawdown,
      sharpeRatio,
      bestTrade,
      worstTrade,
      maxWinStreak,
      maxLossStreak,
      currentStreak,
      expectancy,
      initialBalance,
      currentBalance: balance
    };
  }, [closedTrades, session, balance]);

  if (!stats) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <Activity className="w-12 h-12 mx-auto mb-4 text-purple-500 opacity-50" />
        <p className="text-gray-400">No trading data yet</p>
        <p className="text-gray-500 text-sm mt-2">
          Complete some trades to see your statistics
        </p>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, subValue, color = 'purple', highlight = false }) => (
    <div
      className={`rounded-xl p-4 transition-all hover:scale-[1.02] ${highlight ? 'ring-1 ring-purple-500/50' : ''}`}
      style={{
        background: highlight
          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.05) 100%)'
          : 'rgba(20, 20, 20, 0.8)',
        border: `1px solid rgba(139, 92, 246, ${highlight ? '0.4' : '0.15'})`
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon className={`w-5 h-5 text-${color}-400`} />
        {subValue && (
          <span className="text-xs text-gray-500">{subValue}</span>
        )}
      </div>
      <div className={`text-2xl font-bold text-${color}-300 mb-1`}>
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Main Performance Metrics */}
      <div
        className="rounded-xl p-6"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-purple-400" />
          Performance Overview
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Target}
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            subValue={`${stats.winningTrades}W / ${stats.losingTrades}L`}
            color={stats.winRate >= 50 ? 'green' : 'red'}
            highlight
          />
          <StatCard
            icon={DollarSign}
            label="Total P&L"
            value={`${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}`}
            subValue={`${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(2)}%`}
            color={stats.totalPnL >= 0 ? 'green' : 'red'}
            highlight
          />
          <StatCard
            icon={Activity}
            label="Profit Factor"
            value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
            subValue="Gross P / Gross L"
            color={stats.profitFactor >= 1.5 ? 'green' : stats.profitFactor >= 1 ? 'yellow' : 'red'}
          />
          <StatCard
            icon={AlertTriangle}
            label="Max Drawdown"
            value={`${stats.maxDrawdown.toFixed(2)}%`}
            subValue="Peak to trough"
            color={stats.maxDrawdown <= 10 ? 'green' : stats.maxDrawdown <= 20 ? 'yellow' : 'red'}
          />
        </div>
      </div>

      {/* Win/Loss Analysis */}
      <div
        className="rounded-xl p-6"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Win/Loss Analysis
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Average Win"
            value={`$${stats.avgWin.toFixed(2)}`}
            color="green"
          />
          <StatCard
            icon={TrendingDown}
            label="Average Loss"
            value={`$${stats.avgLoss.toFixed(2)}`}
            color="red"
          />
          <StatCard
            icon={Percent}
            label="Risk/Reward"
            value={stats.riskRewardRatio === Infinity ? '∞' : `${stats.riskRewardRatio.toFixed(2)}:1`}
            color={stats.riskRewardRatio >= 2 ? 'green' : stats.riskRewardRatio >= 1 ? 'yellow' : 'red'}
          />
          <StatCard
            icon={DollarSign}
            label="Expectancy"
            value={`${stats.expectancy >= 0 ? '+' : ''}$${stats.expectancy.toFixed(2)}`}
            subValue="Per trade"
            color={stats.expectancy >= 0 ? 'green' : 'red'}
          />
        </div>

        {/* Visual Win Rate Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-green-400">{stats.winningTrades} Wins</span>
            <span className="text-gray-400">{stats.totalTrades} Total</span>
            <span className="text-red-400">{stats.losingTrades} Losses</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
            <div
              className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
              style={{ width: `${stats.winRate}%` }}
            />
            <div
              className="bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
              style={{ width: `${100 - stats.winRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Advanced Metrics */}
      <div
        className="rounded-xl p-6"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-400" />
          Advanced Metrics
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Activity}
            label="Sharpe Ratio"
            value={stats.sharpeRatio.toFixed(2)}
            subValue="Annualized"
            color={stats.sharpeRatio >= 1 ? 'green' : stats.sharpeRatio >= 0 ? 'yellow' : 'red'}
          />
          <StatCard
            icon={TrendingUp}
            label="Best Trade"
            value={`+$${stats.bestTrade.toFixed(2)}`}
            color="green"
          />
          <StatCard
            icon={TrendingDown}
            label="Worst Trade"
            value={`$${stats.worstTrade.toFixed(2)}`}
            color="red"
          />
          <StatCard
            icon={Award}
            label="Current Streak"
            value={Math.abs(stats.currentStreak)}
            subValue={stats.currentStreak > 0 ? 'Wins' : stats.currentStreak < 0 ? 'Losses' : 'N/A'}
            color={stats.currentStreak > 0 ? 'green' : stats.currentStreak < 0 ? 'red' : 'gray'}
          />
        </div>

        {/* Streaks */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-green-900/20 border border-green-500/20">
            <div className="text-sm text-gray-400 mb-1">Best Win Streak</div>
            <div className="text-2xl font-bold text-green-400">{stats.maxWinStreak} trades</div>
          </div>
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-500/20">
            <div className="text-sm text-gray-400 mb-1">Worst Loss Streak</div>
            <div className="text-2xl font-bold text-red-400">{stats.maxLossStreak} trades</div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div
        className="rounded-xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(10, 10, 10, 0.9) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)'
        }}
      >
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-sm text-gray-400 mb-1">Starting Balance</div>
            <div className="text-xl font-bold text-white">${stats.initialBalance.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Current Balance</div>
            <div className={`text-xl font-bold ${stats.currentBalance >= stats.initialBalance ? 'text-green-400' : 'text-red-400'}`}>
              ${stats.currentBalance.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 mb-1">Total Trades</div>
            <div className="text-xl font-bold text-purple-400">{stats.totalTrades}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradingStats;
