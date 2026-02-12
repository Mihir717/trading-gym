import { useState, useEffect, useMemo } from 'react';
import useStore from '../store/useStore';
import {
  Trophy,
  Medal,
  TrendingUp,
  Target,
  Flame,
  Crown,
  Star,
  Award,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

// Achievement badges that traders can earn
const ACHIEVEMENTS = [
  { id: 'first_trade', name: 'First Trade', icon: Star, description: 'Complete your first trade', color: 'yellow' },
  { id: 'win_streak_5', name: 'Hot Streak', icon: Flame, description: '5 winning trades in a row', color: 'orange' },
  { id: 'win_streak_10', name: 'On Fire', icon: Flame, description: '10 winning trades in a row', color: 'red' },
  { id: 'profit_100', name: 'Century', icon: TrendingUp, description: 'Profit $100+', color: 'green' },
  { id: 'profit_1000', name: 'Grand', icon: TrendingUp, description: 'Profit $1,000+', color: 'blue' },
  { id: 'win_rate_60', name: 'Consistent', icon: Target, description: '60%+ win rate (10+ trades)', color: 'purple' },
  { id: 'win_rate_70', name: 'Sharp Shooter', icon: Target, description: '70%+ win rate (10+ trades)', color: 'cyan' },
  { id: 'trades_10', name: 'Getting Started', icon: Award, description: 'Complete 10 trades', color: 'gray' },
  { id: 'trades_50', name: 'Experienced', icon: Award, description: 'Complete 50 trades', color: 'blue' },
  { id: 'trades_100', name: 'Veteran', icon: Crown, description: 'Complete 100 trades', color: 'purple' },
  { id: 'comeback', name: 'Comeback Kid', icon: Medal, description: 'Recover from 10%+ drawdown', color: 'green' },
];

const BADGE_COLORS = {
  yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

function Leaderboard() {
  const closedTrades = useStore((state) => state.closedTrades);
  const balance = useStore((state) => state.balance);
  const session = useStore((state) => state.session);

  const [leaderboard, setLeaderboard] = useState([]);
  const [showAchievements, setShowAchievements] = useState(true);

  // Calculate user's stats and achievements
  const userStats = useMemo(() => {
    const initialBalance = session?.initial_balance || session?.initialBalance || 10000;
    const totalPnL = balance - initialBalance;
    const totalReturn = ((balance - initialBalance) / initialBalance) * 100;
    const totalTrades = closedTrades.length;

    if (totalTrades === 0) {
      return {
        totalPnL: 0,
        totalReturn: 0,
        winRate: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        maxWinStreak: 0,
        currentStreak: 0,
        maxDrawdown: 0,
        achievements: []
      };
    }

    const winningTrades = closedTrades.filter(t => parseFloat(t.pnl) > 0);
    const losingTrades = closedTrades.filter(t => parseFloat(t.pnl) < 0);
    const winRate = (winningTrades.length / totalTrades) * 100;

    // Calculate streaks
    let maxWinStreak = 0;
    let currentWinStreak = 0;
    let currentStreak = 0;

    closedTrades.forEach((trade, i) => {
      const pnl = parseFloat(trade.pnl);
      if (pnl > 0) {
        currentWinStreak++;
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
      } else {
        currentWinStreak = 0;
      }
    });

    // Current streak (from end)
    for (let i = closedTrades.length - 1; i >= 0; i--) {
      const pnl = parseFloat(closedTrades[i].pnl);
      if (i === closedTrades.length - 1) {
        currentStreak = pnl > 0 ? 1 : -1;
      } else {
        const prevPnl = parseFloat(closedTrades[i + 1].pnl);
        if ((pnl > 0 && prevPnl > 0) || (pnl < 0 && prevPnl < 0)) {
          currentStreak += pnl > 0 ? 1 : -1;
        } else {
          break;
        }
      }
    }

    // Calculate max drawdown
    let peak = initialBalance;
    let maxDrawdown = 0;
    let runningBalance = initialBalance;

    closedTrades.forEach(trade => {
      runningBalance += parseFloat(trade.pnl || 0);
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const drawdown = ((peak - runningBalance) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });

    // Check had drawdown > 10% and recovered
    let hadSignificantDrawdown = maxDrawdown >= 10;
    let recovered = hadSignificantDrawdown && totalPnL > 0;

    // Calculate achievements
    const achievements = [];

    if (totalTrades >= 1) achievements.push('first_trade');
    if (maxWinStreak >= 5) achievements.push('win_streak_5');
    if (maxWinStreak >= 10) achievements.push('win_streak_10');
    if (totalPnL >= 100) achievements.push('profit_100');
    if (totalPnL >= 1000) achievements.push('profit_1000');
    if (winRate >= 60 && totalTrades >= 10) achievements.push('win_rate_60');
    if (winRate >= 70 && totalTrades >= 10) achievements.push('win_rate_70');
    if (totalTrades >= 10) achievements.push('trades_10');
    if (totalTrades >= 50) achievements.push('trades_50');
    if (totalTrades >= 100) achievements.push('trades_100');
    if (recovered) achievements.push('comeback');

    return {
      totalPnL,
      totalReturn,
      winRate,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      maxWinStreak,
      currentStreak,
      maxDrawdown,
      achievements
    };
  }, [closedTrades, balance, session]);

  // Load/save leaderboard from localStorage (simulated local leaderboard)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('trading_gym_leaderboard');
      if (saved) {
        setLeaderboard(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load leaderboard:', e);
    }
  }, []);

  // Update leaderboard entry
  const updateLeaderboard = () => {
    if (userStats.totalTrades === 0) return;

    const username = localStorage.getItem('trading_gym_username') || 'Anonymous Trader';
    const userId = localStorage.getItem('trading_gym_user_id') || Math.random().toString(36).substring(7);

    // Save user ID if new
    if (!localStorage.getItem('trading_gym_user_id')) {
      localStorage.setItem('trading_gym_user_id', userId);
    }

    const newEntry = {
      id: userId,
      name: username,
      totalReturn: userStats.totalReturn,
      totalPnL: userStats.totalPnL,
      winRate: userStats.winRate,
      totalTrades: userStats.totalTrades,
      achievements: userStats.achievements,
      updatedAt: Date.now()
    };

    const updatedLeaderboard = [...leaderboard.filter(e => e.id !== userId), newEntry]
      .sort((a, b) => b.totalReturn - a.totalReturn)
      .slice(0, 100); // Keep top 100

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('trading_gym_leaderboard', JSON.stringify(updatedLeaderboard));
  };

  // Get user's rank
  const userRank = useMemo(() => {
    const userId = localStorage.getItem('trading_gym_user_id');
    const index = leaderboard.findIndex(e => e.id === userId);
    return index === -1 ? null : index + 1;
  }, [leaderboard]);

  // Get achievement details
  const getAchievement = (id) => ACHIEVEMENTS.find(a => a.id === id);

  if (closedTrades.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <Trophy className="w-12 h-12 mx-auto mb-4 text-purple-500 opacity-50" />
        <p className="text-gray-400">Start trading to earn achievements</p>
        <p className="text-gray-500 text-sm mt-2">
          Complete trades to climb the leaderboard and unlock badges
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Your Stats Card */}
      <div
        className="rounded-xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(10, 10, 10, 0.9) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Your Performance</h3>
          </div>
          {userRank && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
              <Medal className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-300">Rank #{userRank}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-black/30">
            <div className="text-xs text-gray-500 mb-1">Total Return</div>
            <div className={`text-xl font-bold ${userStats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {userStats.totalReturn >= 0 ? '+' : ''}{userStats.totalReturn.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-black/30">
            <div className="text-xs text-gray-500 mb-1">Win Rate</div>
            <div className={`text-xl font-bold ${userStats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {userStats.winRate.toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-black/30">
            <div className="text-xs text-gray-500 mb-1">Total Trades</div>
            <div className="text-xl font-bold text-purple-400">{userStats.totalTrades}</div>
          </div>
          <div className="p-3 rounded-lg bg-black/30">
            <div className="text-xs text-gray-500 mb-1">Best Streak</div>
            <div className="text-xl font-bold text-yellow-400">{userStats.maxWinStreak} wins</div>
          </div>
        </div>

        <button
          onClick={updateLeaderboard}
          className="w-full py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all"
        >
          Update Leaderboard Position
        </button>
      </div>

      {/* Achievements Section */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <button
          onClick={() => setShowAchievements(!showAchievements)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Achievements</h3>
            <span className="text-sm text-gray-500">
              ({userStats.achievements.length}/{ACHIEVEMENTS.length})
            </span>
          </div>
          {showAchievements ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showAchievements && (
          <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((achievement) => {
              const earned = userStats.achievements.includes(achievement.id);
              const Icon = achievement.icon;

              return (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-xl border transition-all ${
                    earned
                      ? BADGE_COLORS[achievement.color]
                      : 'bg-gray-900/50 text-gray-600 border-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${earned ? '' : 'opacity-30'}`} />
                    <span className={`font-medium text-sm ${earned ? '' : 'text-gray-600'}`}>
                      {achievement.name}
                    </span>
                  </div>
                  <p className={`text-xs ${earned ? 'opacity-80' : 'text-gray-700'}`}>
                    {achievement.description}
                  </p>
                  {earned && (
                    <div className="mt-2 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span className="text-xs">Earned!</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(10, 10, 10, 0.9)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
      >
        <div className="p-4 border-b border-purple-500/20">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-white">Leaderboard</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">Top traders by total return</p>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No entries yet</p>
            <p className="text-sm mt-1">Be the first to join the leaderboard!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {leaderboard.slice(0, 10).map((entry, index) => {
              const userId = localStorage.getItem('trading_gym_user_id');
              const isCurrentUser = entry.id === userId;
              const rank = index + 1;

              return (
                <div
                  key={entry.id}
                  className={`p-4 flex items-center gap-4 ${
                    isCurrentUser ? 'bg-purple-500/10' : 'hover:bg-gray-800/30'
                  } transition-colors`}
                >
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {rank === 1 ? (
                      <Crown className="w-6 h-6 text-yellow-400 mx-auto" />
                    ) : rank === 2 ? (
                      <Medal className="w-6 h-6 text-gray-400 mx-auto" />
                    ) : rank === 3 ? (
                      <Medal className="w-6 h-6 text-orange-400 mx-auto" />
                    ) : (
                      <span className="text-gray-500 font-bold">{rank}</span>
                    )}
                  </div>

                  {/* Name & Badges */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
                        {entry.name}
                        {isCurrentUser && <span className="text-purple-400 text-sm ml-2">(You)</span>}
                      </span>
                    </div>
                    {entry.achievements && entry.achievements.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {entry.achievements.slice(0, 5).map(achId => {
                          const ach = getAchievement(achId);
                          if (!ach) return null;
                          const Icon = ach.icon;
                          return (
                            <div
                              key={achId}
                              className={`p-1 rounded ${BADGE_COLORS[ach.color]}`}
                              title={ach.name}
                            >
                              <Icon className="w-3 h-3" />
                            </div>
                          );
                        })}
                        {entry.achievements.length > 5 && (
                          <span className="text-xs text-gray-500 px-1">+{entry.achievements.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <div className={`font-bold ${entry.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {entry.totalReturn >= 0 ? '+' : ''}{entry.totalReturn.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.totalTrades} trades • {entry.winRate.toFixed(0)}% WR
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
