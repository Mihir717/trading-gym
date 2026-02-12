import { useState, useEffect, useRef, useCallback } from 'react';
import { replayAPI } from '../services/api';
import useStore from '../store/useStore';
import Chart from '../components/Chart';
import ReplayControls from '../components/ReplayControls';
import OrderPanel from '../components/OrderPanel';
import PositionsList from '../components/PositionsList';
import TradeHistory from '../components/TradeHistory';
import EquityCurve from '../components/EquityCurve';
import TradingStats from '../components/TradingStats';
import TradeJournal from '../components/TradeJournal';
import Leaderboard from '../components/Leaderboard';
import { ChevronUp, ChevronDown, Maximize2, Minimize2, BarChart3, GripVertical, Zap, BookOpen, Activity, Trophy, Menu, X, ShoppingCart } from 'lucide-react';

// Hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

function TradingDashboard() {
  const session = useStore((state) => state.session);
  const candlesWithTicks = useStore((state) => state.candlesWithTicks);
  const setCandlesWithTicks = useStore((state) => state.setCandlesWithTicks);
  const setCandles = useStore((state) => state.setCandles);
  const currentCandleIndex = useStore((state) => state.currentCandleIndex);
  const currentTickIndex = useStore((state) => state.currentTickIndex);
  const progressiveMode = useStore((state) => state.progressiveMode);
  const setProgressiveMode = useStore((state) => state.setProgressiveMode);
  const getVisibleCandles = useStore((state) => state.getVisibleCandles);
  const getCurrentFormingCandle = useStore((state) => state.getCurrentFormingCandle);
  const logout = useStore((state) => state.logout);
  const balance = useStore((state) => state.balance);
  const openTrades = useStore((state) => state.openTrades);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trading');
  const [analyticsTab, setAnalyticsTab] = useState('stats');
  const [showOrderPanel, setShowOrderPanel] = useState(true);
  const [panelMinimized, setPanelMinimized] = useState(false);
  const [showPositions, setShowPositions] = useState(false);
  const [hasTickData, setHasTickData] = useState(false);

  const [panelPosition, setPanelPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Mobile states
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTradeOpen, setMobileTradeOpen] = useState(false);

  useEffect(() => {
    loadCandles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCandles = async () => {
    try {
      // Try to load candles with ticks first
      const response = await replayAPI.getCandlesWithTicks(session.sessionId, 0, 500);
      const candlesData = response.data.candles;

      // Check if we have tick data
      const hasTicks = candlesData.some(c => c.ticks && c.ticks.length > 0);
      setHasTickData(hasTicks);

      if (hasTicks) {
        setCandlesWithTicks(candlesData);
      } else {
        // Fallback to regular candles
        const fallbackResponse = await replayAPI.getCandles(session.sessionId, 0, 1000);
        setCandles(fallbackResponse.data.candles);
        setCandlesWithTicks(fallbackResponse.data.candles.map(c => ({
          ...c,
          ticks: [] // No ticks available
        })));
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load candles:', error);
      // Fallback to regular candles
      try {
        const response = await replayAPI.getCandles(session.sessionId, 0, 1000);
        setCandles(response.data.candles);
        setCandlesWithTicks(response.data.candles.map(c => ({
          ...c,
          ticks: []
        })));
        setHasTickData(false);
      } catch (fallbackError) {
        console.error('Fallback failed:', fallbackError);
      }
      setLoading(false);
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - panelPosition.x,
        y: e.clientY - panelPosition.y
      };
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPanelPosition({
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Get visible candles for the chart
  const visibleCandles = getVisibleCandles();

  // Get current price from forming candle
  const formingCandle = getCurrentFormingCandle();
  const currentPrice = formingCandle?.close || 0;
  const tickProgress = formingCandle?.tickProgress || 0;

  const safeBalance = Number(balance) || 0;
  const totalPnL = safeBalance - (session?.initialBalance || 10000);

  // Calculate total ticks for progress display
  const currentCandle = candlesWithTicks[currentCandleIndex];
  const totalTicks = currentCandle?.ticks?.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-purple-500 text-2xl mb-4">⚡</div>
          <div className="text-xl text-white">Loading market data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden select-none">
      {/* Top Header - Responsive */}
      <div className="h-14 bg-gradient-to-r from-black via-purple-950/20 to-black border-b border-purple-500/10 flex items-center justify-between px-3 md:px-6 z-50">
        <div className="flex items-center gap-2 md:gap-6">
          <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
            {isMobile ? 'TG' : 'Trading Gym'}
          </h1>
          <div className="flex gap-2 md:gap-4 text-xs md:text-sm text-gray-400">
            <span className="text-purple-400">{session.asset?.replace('USDT', '')}</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{session.timeframe}</span>
            <span>•</span>
            <span className={safeBalance >= (session?.initialBalance || 10000) ? 'text-green-400' : 'text-red-400'}>
              ${isMobile ? safeBalance.toFixed(0) : safeBalance.toFixed(2)}
            </span>
            <span className={`hidden sm:inline ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ({totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)})
            </span>
          </div>
        </div>

        {/* Desktop Controls */}
        <div className="hidden md:flex gap-3 items-center">
          {/* Progressive Mode Toggle */}
          {hasTickData && (
            <button
              onClick={() => setProgressiveMode(!progressiveMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                progressiveMode
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-transparent border-gray-700 text-gray-500'
              }`}
              title={progressiveMode ? 'Progressive mode: Candles form tick by tick' : 'Instant mode: Full candles'}
            >
              <Zap size={14} className={progressiveMode ? 'text-purple-400' : 'text-gray-500'} />
              <span>{progressiveMode ? 'Progressive' : 'Instant'}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab(activeTab === 'trading' ? 'analytics' : 'trading')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all hover:bg-purple-500/10"
            style={{
              background: activeTab === 'analytics' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
              borderColor: activeTab === 'analytics' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.1)',
              color: activeTab === 'analytics' ? '#a78bfa' : '#9ca3af'
            }}
          >
            <BarChart3 size={16} />
            <span className="text-sm">{activeTab === 'trading' ? 'Analytics' : 'Trading'}</span>
          </button>

          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg border border-gray-700 hover:border-gray-600 text-gray-400 hover:text-gray-300 transition-all text-sm"
          >
            Logout
          </button>
        </div>

        {/* Mobile Controls */}
        <div className="flex md:hidden gap-2 items-center">
          {activeTab === 'trading' && (
            <button
              onClick={() => setMobileTradeOpen(true)}
              className="p-2 rounded-lg bg-purple-600 text-white"
            >
              <ShoppingCart size={18} />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg border border-gray-700 text-gray-400"
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm">
          <div className="flex flex-col h-full p-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-purple-400">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg bg-gray-800 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setActiveTab('trading');
                  setMobileMenuOpen(false);
                }}
                className={`p-4 rounded-xl text-left transition-all ${
                  activeTab === 'trading'
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                    : 'bg-gray-900/50 border border-gray-800 text-gray-400'
                }`}
              >
                <BarChart3 className="inline mr-3" size={20} />
                Trading View
              </button>

              <button
                onClick={() => {
                  setActiveTab('analytics');
                  setAnalyticsTab('stats');
                  setMobileMenuOpen(false);
                }}
                className={`p-4 rounded-xl text-left transition-all ${
                  activeTab === 'analytics' && analyticsTab === 'stats'
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                    : 'bg-gray-900/50 border border-gray-800 text-gray-400'
                }`}
              >
                <Activity className="inline mr-3" size={20} />
                Statistics
              </button>

              <button
                onClick={() => {
                  setActiveTab('analytics');
                  setAnalyticsTab('journal');
                  setMobileMenuOpen(false);
                }}
                className={`p-4 rounded-xl text-left transition-all ${
                  activeTab === 'analytics' && analyticsTab === 'journal'
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                    : 'bg-gray-900/50 border border-gray-800 text-gray-400'
                }`}
              >
                <BookOpen className="inline mr-3" size={20} />
                Journal
              </button>

              <button
                onClick={() => {
                  setActiveTab('analytics');
                  setAnalyticsTab('leaderboard');
                  setMobileMenuOpen(false);
                }}
                className={`p-4 rounded-xl text-left transition-all ${
                  activeTab === 'analytics' && analyticsTab === 'leaderboard'
                    ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                    : 'bg-gray-900/50 border border-gray-800 text-gray-400'
                }`}
              >
                <Trophy className="inline mr-3" size={20} />
                Leaderboard
              </button>

              {hasTickData && (
                <button
                  onClick={() => setProgressiveMode(!progressiveMode)}
                  className={`p-4 rounded-xl text-left transition-all ${
                    progressiveMode
                      ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                      : 'bg-gray-900/50 border border-gray-800 text-gray-400'
                  }`}
                >
                  <Zap className="inline mr-3" size={20} />
                  {progressiveMode ? 'Progressive Mode' : 'Instant Mode'}
                </button>
              )}

              <div className="mt-auto pt-6">
                <button
                  onClick={logout}
                  className="w-full p-4 rounded-xl bg-red-900/30 border border-red-500/30 text-red-400"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Trade Panel Overlay */}
      {isMobile && mobileTradeOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm overflow-y-auto">
          <div className="p-4 min-h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-purple-400">Quick Trade</h2>
              <button
                onClick={() => setMobileTradeOpen(false)}
                className="p-2 rounded-lg bg-gray-800 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Current Price */}
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/20">
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm text-purple-300">Current Price</div>
                {progressiveMode && hasTickData && totalTicks > 0 && (
                  <div className="text-xs text-gray-500">
                    Tick {currentTickIndex + 1}/{totalTicks}
                  </div>
                )}
              </div>
              <div className="text-3xl font-bold text-purple-400">
                ${currentPrice.toFixed(2)}
              </div>
            </div>

            <OrderPanel currentPrice={currentPrice} onTradeComplete={() => setMobileTradeOpen(false)} />

            {/* Open Positions */}
            {openTrades.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-white mb-3">Open Positions</h3>
                <PositionsList currentPrice={currentPrice} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'trading' ? (
        <div className="flex-1 relative overflow-hidden">
          {/* Full-Screen Chart */}
          <div className="absolute inset-0 p-2 md:p-4">
            <Chart candles={visibleCandles} />
          </div>

          {/* Replay Controls - Bottom Left (Responsive) */}
          <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-auto z-40">
            <ReplayControls isMobile={isMobile} />
          </div>

          {/* Draggable Order Panel - Desktop Only */}
          {showOrderPanel && !isMobile && (
            <div
              ref={dragRef}
              onMouseDown={handleMouseDown}
              className="absolute z-50 rounded-xl overflow-hidden shadow-2xl"
              style={{
                left: `${panelPosition.x}px`,
                top: `${panelPosition.y}px`,
                width: panelMinimized ? '280px' : '340px',
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(139, 92, 246, 0.1)',
                cursor: isDragging ? 'grabbing' : 'auto',
                transition: isDragging ? 'none' : 'width 0.3s ease'
              }}
            >
              {/* Drag Handle Header */}
              <div className="drag-handle flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-900/30 to-purple-800/30 border-b border-purple-500/20 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2">
                  <GripVertical size={16} className="text-purple-400" />
                  <span className="text-sm font-semibold text-purple-300">Quick Trade</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPanelMinimized(!panelMinimized);
                    }}
                    className="p-1 hover:bg-purple-500/20 rounded transition-colors"
                  >
                    {panelMinimized ? <Maximize2 size={14} className="text-purple-400" /> : <Minimize2 size={14} className="text-purple-400" />}
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              {!panelMinimized && (
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                  {/* Current Price */}
                  <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/20">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs text-purple-300">Current Price</div>
                      {progressiveMode && hasTickData && totalTicks > 0 && (
                        <div className="text-xs text-gray-500">
                          Tick {currentTickIndex + 1}/{totalTicks}
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-purple-400">
                      ${currentPrice.toFixed(2)}
                    </div>
                    {/* Tick progress bar */}
                    {progressiveMode && hasTickData && tickProgress > 0 && (
                      <div className="mt-2 h-1 bg-purple-900/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-100"
                          style={{ width: `${tickProgress * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <OrderPanel currentPrice={currentPrice} />

                  {/* Quick Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-purple-900/20 border border-purple-500/10">
                      <div className="text-xs text-gray-400">Balance</div>
                      <div className={`text-sm font-bold ${safeBalance >= (session?.initialBalance || 10000) ? 'text-green-400' : 'text-red-400'}`}>
                        ${safeBalance.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-900/20 border border-purple-500/10">
                      <div className="text-xs text-gray-400">Positions</div>
                      <div className="text-sm font-bold text-purple-400">{openTrades.length}</div>
                    </div>
                  </div>
                </div>
              )}

              {panelMinimized && (
                <div className="p-4">
                  <div className="text-center text-sm text-gray-400">
                    {openTrades.length} position{openTrades.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Toggle Panel Button - Desktop Only */}
          {!showOrderPanel && !isMobile && (
            <button
              onClick={() => setShowOrderPanel(true)}
              className="absolute top-4 right-4 z-40 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-medium shadow-lg transition-all"
            >
              Quick Trade
            </button>
          )}

          {/* Open Positions Drawer - Desktop Only */}
          {!isMobile && (
            <div
              className="absolute bottom-0 left-0 right-0 z-30 transition-all duration-300"
              style={{
                height: showPositions ? '280px' : '48px',
                background: 'rgba(10, 10, 10, 0.95)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(139, 92, 246, 0.2)'
              }}
            >
              <button
                onClick={() => setShowPositions(!showPositions)}
                className="w-full h-12 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-purple-400 transition-colors border-b border-purple-500/10"
              >
                {showPositions ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <span>Open Positions ({openTrades.length})</span>
                {showPositions ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>

              <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
                {showPositions && <PositionsList currentPrice={currentPrice} />}
              </div>
            </div>
          )}

          {/* Mobile Positions Indicator */}
          {isMobile && openTrades.length > 0 && (
            <button
              onClick={() => setMobileTradeOpen(true)}
              className="absolute bottom-16 right-2 z-40 px-3 py-2 rounded-lg bg-purple-600/90 text-white text-sm font-medium shadow-lg flex items-center gap-2"
            >
              <span>{openTrades.length} Open</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col bg-black">
          {/* Analytics Tab Navigation - Responsive */}
          <div className="flex gap-2 px-3 md:px-6 pt-3 md:pt-4 border-b border-purple-500/10 pb-3 md:pb-4 overflow-x-auto">
            <button
              onClick={() => setAnalyticsTab('stats')}
              className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg border text-xs md:text-sm transition-all whitespace-nowrap ${
                analyticsTab === 'stats'
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Activity size={isMobile ? 14 : 16} />
              <span className="hidden sm:inline">Statistics</span>
              <span className="sm:hidden">Stats</span>
            </button>
            <button
              onClick={() => setAnalyticsTab('journal')}
              className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg border text-xs md:text-sm transition-all whitespace-nowrap ${
                analyticsTab === 'journal'
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <BookOpen size={isMobile ? 14 : 16} />
              Journal
            </button>
            <button
              onClick={() => setAnalyticsTab('equity')}
              className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg border text-xs md:text-sm transition-all whitespace-nowrap ${
                analyticsTab === 'equity'
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <BarChart3 size={isMobile ? 14 : 16} />
              <span className="hidden sm:inline">Equity</span>
              <span className="sm:hidden">Equity</span>
            </button>
            <button
              onClick={() => setAnalyticsTab('leaderboard')}
              className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 rounded-lg border text-xs md:text-sm transition-all whitespace-nowrap ${
                analyticsTab === 'leaderboard'
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Trophy size={isMobile ? 14 : 16} />
              <span className="hidden sm:inline">Leaderboard</span>
              <span className="sm:hidden">Ranks</span>
            </button>
          </div>

          {/* Analytics Content */}
          <div className="flex-1 overflow-auto p-3 md:p-6">
            {analyticsTab === 'stats' && <TradingStats />}
            {analyticsTab === 'journal' && <TradeJournal />}
            {analyticsTab === 'equity' && (
              <>
                <EquityCurve />
                <div className="mt-6">
                  <TradeHistory />
                </div>
              </>
            )}
            {analyticsTab === 'leaderboard' && <Leaderboard />}
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingDashboard;
