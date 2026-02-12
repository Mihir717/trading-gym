import { Play, Pause, SkipForward, FastForward, Zap } from 'lucide-react';
import useStore from '../store/useStore';
import { useEffect } from 'react';

function ReplayControls({ isMobile = false }) {
  const isPlaying = useStore((state) => state.isPlaying);
  const replaySpeed = useStore((state) => state.replaySpeed);
  const setIsPlaying = useStore((state) => state.setIsPlaying);
  const setReplaySpeed = useStore((state) => state.setReplaySpeed);
  const advanceCandle = useStore((state) => state.advanceCandle);
  const advanceTick = useStore((state) => state.advanceTick);
  const currentCandleIndex = useStore((state) => state.currentCandleIndex);
  const currentTickIndex = useStore((state) => state.currentTickIndex);
  const candlesWithTicks = useStore((state) => state.candlesWithTicks);
  const progressiveMode = useStore((state) => state.progressiveMode);
  const checkAndExecuteSLTP = useStore((state) => state.checkAndExecuteSLTP);
  const getCurrentFormingCandle = useStore((state) => state.getCurrentFormingCandle);

  // Auto-play effect - advances ticks or candles based on mode
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const formingCandle = getCurrentFormingCandle();

      if (formingCandle) {
        // Check SL/TP on current tick price
        checkAndExecuteSLTP(formingCandle);
      }

      if (progressiveMode) {
        // Progressive mode: advance tick by tick
        advanceTick();
      } else {
        // Instant mode: advance full candle
        advanceCandle();
      }
    }, progressiveMode ? 170 / replaySpeed : 1400 / replaySpeed); // 40% slower base speed

    return () => clearInterval(interval);
  }, [isPlaying, replaySpeed, advanceCandle, advanceTick, progressiveMode, checkAndExecuteSLTP, getCurrentFormingCandle]);

  // Skip to next tick (progressive mode only)
  const handleSkipTick = () => {
    const formingCandle = getCurrentFormingCandle();
    if (formingCandle) {
      checkAndExecuteSLTP(formingCandle);
    }
    advanceTick();
  };

  // Skip entire candle (jump to next candle)
  const handleSkipCandle = () => {
    const currentCandle = candlesWithTicks[currentCandleIndex];
    if (currentCandle) {
      // Check SL/TP on full candle values
      checkAndExecuteSLTP({
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close
      });
    }

    // If in progressive mode, we need to skip remaining ticks
    if (progressiveMode) {
      const ticksRemaining = (currentCandle?.ticks?.length || 1) - currentTickIndex - 1;
      for (let i = 0; i <= ticksRemaining; i++) {
        advanceTick();
      }
    } else {
      advanceCandle();
    }
  };

  const speeds = [1, 2, 5, 10, 30];
  const currentCandle = candlesWithTicks[currentCandleIndex];
  const totalTicks = currentCandle?.ticks?.length || 0;
  const hasTicks = totalTicks > 0;

  // Mobile-optimized speeds
  const mobileSpeeds = [1, 2, 5];

  return (
    <div
      className={`rounded-xl overflow-hidden ${isMobile ? 'w-full' : ''}`}
      style={{
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(139, 92, 246, 0.1)'
      }}
    >
      <div className={`${isMobile ? 'p-2' : 'p-4'}`}>
        <div className={`flex items-center ${isMobile ? 'gap-2 flex-wrap' : 'gap-4'}`}>
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg transition-all ${
              isPlaying
                ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30'
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white'
            }`}
          >
            {isPlaying ? <Pause size={isMobile ? 18 : 20} /> : <Play size={isMobile ? 18 : 20} />}
          </button>

          {/* Skip Tick Button (only in progressive mode with tick data) - hide on mobile */}
          {progressiveMode && hasTicks && !isMobile && (
            <button
              onClick={handleSkipTick}
              className="p-3 rounded-lg bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 transition-all"
              title="Skip to next tick"
            >
              <Zap size={20} />
            </button>
          )}

          {/* Skip Candle Button */}
          <button
            onClick={handleSkipCandle}
            className={`${isMobile ? 'p-2' : 'p-3'} rounded-lg bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 transition-all`}
            title="Skip to next candle"
          >
            {progressiveMode && hasTicks ? <FastForward size={isMobile ? 18 : 20} /> : <SkipForward size={isMobile ? 18 : 20} />}
          </button>

          {/* Speed Controls */}
          <div className={`flex gap-1 ${isMobile ? 'ml-auto' : 'ml-2'}`}>
            {(isMobile ? mobileSpeeds : speeds).map((speed) => (
              <button
                key={speed}
                onClick={() => setReplaySpeed(speed)}
                className={`${isMobile ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'} rounded-lg font-medium transition-all ${
                  replaySpeed === speed
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-purple-900/20 text-gray-400 border border-purple-500/10 hover:border-purple-500/30 hover:text-purple-300'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Progress Display - Desktop only */}
          {!isMobile && (
            <div className="ml-auto flex items-center gap-4 text-sm">
              {/* Candle Progress */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Candle:</span>
                <span className="text-purple-300 font-mono">
                  {currentCandleIndex + 1} / {candlesWithTicks.length}
                </span>
              </div>

              {/* Tick Progress (only in progressive mode with tick data) */}
              {progressiveMode && hasTicks && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Tick:</span>
                  <span className="text-purple-300 font-mono">
                    {currentTickIndex + 1} / {totalTicks}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Progress Display */}
        {isMobile && (
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>Candle {currentCandleIndex + 1}/{candlesWithTicks.length}</span>
            {progressiveMode && hasTicks && (
              <span>Tick {currentTickIndex + 1}/{totalTicks}</span>
            )}
          </div>
        )}

        {/* Tick Progress Bar (only in progressive mode with tick data) */}
        {progressiveMode && hasTicks && (
          <div className={`${isMobile ? 'mt-2' : 'mt-3'} h-1.5 bg-purple-900/30 rounded-full overflow-hidden`}>
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-100"
              style={{ width: `${((currentTickIndex + 1) / totalTicks) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ReplayControls;
