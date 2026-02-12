import { useState, useEffect } from 'react';
import Login from './pages/Login';
import SessionSetup from './pages/SessionSetup';
import TradingDashboard from './pages/TradingDashboard';
import useStore from './store/useStore';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [hasSession, setHasSession] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedSessionInfo, setSavedSessionInfo] = useState(null);

  const session = useStore((state) => state.session);
  const clearSession = useStore((state) => state.clearSession);

  // Check for existing session on mount
  useEffect(() => {
    if (isLoggedIn && session) {
      // We have a saved session - ask user if they want to resume
      const savedData = localStorage.getItem('trading_gym_session_state');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          // Check if session is less than 24 hours old
          if (parsed.savedAt && Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
            setSavedSessionInfo({
              asset: parsed.session?.asset || 'BTCUSDT',
              timeframe: parsed.session?.timeframe || '5m',
              balance: Number(parsed.balance) || 10000,
              openTrades: parsed.openTrades?.length || 0,
              closedTrades: parsed.closedTrades?.length || 0,
              candleProgress: parsed.currentCandleIndex || 0,
              savedAt: new Date(parsed.savedAt).toLocaleString(),
            });
            setShowResumePrompt(true);
            return;
          }
        } catch (e) {
          console.error('Failed to parse saved session:', e);
        }
      }
    }
  }, [isLoggedIn, session]);

  const handleResumeSession = () => {
    setShowResumePrompt(false);
    setHasSession(true);
  };

  const handleNewSession = () => {
    clearSession();
    setShowResumePrompt(false);
    setHasSession(false);
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  // Resume session prompt
  if (showResumePrompt && savedSessionInfo) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)'
        }}
      >
        <div
          className="max-w-md w-full rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 50px rgba(139, 92, 246, 0.15)'
          }}
        >
          <div className="p-6 border-b" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
            <h2 className="text-xl font-bold text-white mb-2">Resume Previous Session?</h2>
            <p className="text-gray-400 text-sm">
              You have an active trading session that was saved.
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* Session Info */}
            <div className="space-y-3 p-4 rounded-xl bg-purple-900/20 border border-purple-500/20">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Asset</span>
                <span className="text-purple-300 font-medium">{savedSessionInfo.asset}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Timeframe</span>
                <span className="text-purple-300 font-medium">{savedSessionInfo.timeframe}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Balance</span>
                <span className={`font-medium ${(Number(savedSessionInfo.balance) || 10000) >= 10000 ? 'text-green-400' : 'text-red-400'}`}>
                  ${(Number(savedSessionInfo.balance) || 10000).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Open Positions</span>
                <span className="text-white font-medium">{savedSessionInfo.openTrades}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Closed Trades</span>
                <span className="text-white font-medium">{savedSessionInfo.closedTrades}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Candles Viewed</span>
                <span className="text-white font-medium">{savedSessionInfo.candleProgress}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-purple-500/20">
                <span className="text-gray-500">Last saved</span>
                <span className="text-gray-400 text-xs">{savedSessionInfo.savedAt}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleNewSession}
                className="flex-1 py-3 rounded-xl font-medium text-gray-300 transition-all hover:bg-gray-800 border border-gray-700"
              >
                New Session
              </button>
              <button
                onClick={handleResumeSession}
                className="flex-1 py-3 rounded-xl font-semibold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
                  boxShadow: '0 10px 40px -10px rgba(139, 92, 246, 0.5)'
                }}
              >
                Resume Session
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return <SessionSetup onSessionStart={() => setHasSession(true)} />;
  }

  return <TradingDashboard />;
}

export default App;
