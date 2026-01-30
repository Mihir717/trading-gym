import { Play, Pause, SkipForward } from 'lucide-react';
import useStore from '../store/useStore';
import { useEffect } from 'react';

function ReplayControls() {
  const isPlaying = useStore((state) => state.isPlaying);
  const replaySpeed = useStore((state) => state.replaySpeed);
  const setIsPlaying = useStore((state) => state.setIsPlaying);
  const setReplaySpeed = useStore((state) => state.setReplaySpeed);
  const advanceCandle = useStore((state) => state.advanceCandle);
  const currentCandleIndex = useStore((state) => state.currentCandleIndex);
  const candles = useStore((state) => state.candles);
  const checkAndExecuteSLTP = useStore((state) => state.checkAndExecuteSLTP);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const currentCandle = candles[currentCandleIndex];
      checkAndExecuteSLTP(currentCandle);
      advanceCandle();
    }, 1000 / replaySpeed);

    return () => clearInterval(interval);
  }, [isPlaying, replaySpeed, advanceCandle, currentCandleIndex, candles, checkAndExecuteSLTP]);

  const speeds = [1, 5, 10, 30];

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-accent-green hover:bg-accent-green/90 rounded-lg"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button
            onClick={() => {
              const currentCandle = candles[currentCandleIndex];
              checkAndExecuteSLTP(currentCandle);
              advanceCandle();
            }}
            className="p-3 bg-bg-primary hover:bg-bg-primary/80 rounded-lg border border-border"
          >
            <SkipForward size={20} />
          </button>

          <div className="flex gap-2">
            {speeds.map((speed) => (
              <button
                key={speed}
                onClick={() => setReplaySpeed(speed)}
                className={`px-4 py-2 rounded ${
                  replaySpeed === speed
                    ? 'bg-accent-green text-white'
                    : 'bg-bg-primary text-text-secondary border border-border'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>

        <div className="text-text-secondary">
          Candle: {currentCandleIndex + 1} / {candles.length}
        </div>
      </div>
    </div>
  );
}

export default ReplayControls;