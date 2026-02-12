import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import useStore from '../store/useStore';
import { Radio } from 'lucide-react';

function Chart({ candles }) {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candlestickSeriesRef = useRef();
  const priceLinesRef = useRef([]);
  const openTrades = useStore((state) => state.openTrades);
  const isMountedRef = useRef(true);
  const lastCandleCountRef = useRef(0);
  const lastCandleDataRef = useRef(null);
  const [isAtLive, setIsAtLive] = useState(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!chartContainerRef.current || !isMountedRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 500,
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#9ca3af',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(139, 92, 246, 0.1)' },
        horzLines: { color: 'rgba(139, 92, 246, 0.1)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(139, 92, 246, 0.5)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'rgba(139, 92, 246, 0.9)',
        },
        horzLine: {
          color: 'rgba(139, 92, 246, 0.5)',
          width: 1,
          style: 2,
          labelBackgroundColor: 'rgba(139, 92, 246, 0.9)',
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: 'rgba(139, 92, 246, 0.2)',
        rightOffset: 5,
        barSpacing: 8,
        minBarSpacing: 2,
        tickMarkFormatter: (time) => {
          const date = new Date(time * 1000);
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(139, 92, 246, 0.2)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      localization: {
        timeFormatter: (time) => {
          const date = new Date(time * 1000);
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${year}-${month}-${day} ${hours}:${minutes}`;
        },
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Track scroll position to show/hide "Go to Live" button
    const handleVisibleRangeChange = () => {
      if (chartRef.current) {
        const scrollPos = chartRef.current.timeScale().scrollPosition();
        // scrollPosition of 0 or positive means we're at the right edge (live)
        setIsAtLive(scrollPos >= -3);
      }
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    const handleResize = () => {
      if (chartContainerRef.current && isMountedRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);

      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      } catch (e) {
        // Ignore
      }

      // Clear price lines first
      if (candlestickSeriesRef.current) {
        priceLinesRef.current.forEach(line => {
          try {
            candlestickSeriesRef.current.removePriceLine(line);
          } catch (e) {
            // Ignore
          }
        });
      }
      priceLinesRef.current = [];

      // Remove chart
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          // Ignore
        }
      }

      chartRef.current = null;
      candlestickSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !candles.length || !isMountedRef.current) return;

    const formattedCandles = candles.map((candle) => ({
      time: new Date(candle.timestamp).getTime() / 1000,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    }));

    const lastCandle = formattedCandles[formattedCandles.length - 1];
    const prevCandleCount = lastCandleCountRef.current;
    const isFirstLoad = prevCandleCount === 0;
    const isNewCandle = candles.length > prevCandleCount;

    try {
      if (isFirstLoad) {
        // First load - set all data, no auto-scroll
        candlestickSeriesRef.current.setData(formattedCandles);
        lastCandleCountRef.current = candles.length;
        lastCandleDataRef.current = JSON.stringify(lastCandle);
      } else if (isNewCandle) {
        // New candle added - just set data, no auto-scroll
        candlestickSeriesRef.current.setData(formattedCandles);
        lastCandleCountRef.current = candles.length;
        lastCandleDataRef.current = JSON.stringify(lastCandle);
      } else {
        // Same candle count - just update the last candle (tick update)
        const lastCandleStr = JSON.stringify(lastCandle);
        if (lastCandleDataRef.current !== lastCandleStr) {
          // Only update if data actually changed
          candlestickSeriesRef.current.update(lastCandle);
          lastCandleDataRef.current = lastCandleStr;
        }
      }
    } catch (e) {
      // Chart might be disposed, try full setData as fallback
      try {
        candlestickSeriesRef.current.setData(formattedCandles);
        lastCandleCountRef.current = candles.length;
      } catch (e2) {
        // Ignore
      }
    }
  }, [candles]);

  // Scroll to live function
  const scrollToLive = () => {
    if (chartRef.current && candles.length > 0) {
      // Scroll to show the last candle on the right
      chartRef.current.timeScale().scrollToPosition(0, false);
      setIsAtLive(true);
    }
  };

  useEffect(() => {
    if (!candlestickSeriesRef.current || !isMountedRef.current) return;

    // Remove existing price lines
    priceLinesRef.current.forEach(line => {
      try {
        candlestickSeriesRef.current.removePriceLine(line);
      } catch (e) {
        // Ignore
      }
    });
    priceLinesRef.current = [];

    // Add price lines for each open trade
    openTrades.forEach((trade) => {
      const entryPrice = parseFloat(trade.entry_price);
      const stopLoss = trade.stop_loss ? parseFloat(trade.stop_loss) : null;
      const takeProfit = trade.take_profit ? parseFloat(trade.take_profit) : null;

      try {
        // Entry line (Yellow/Orange)
        const entryLine = candlestickSeriesRef.current.createPriceLine({
          price: entryPrice,
          color: '#f59e0b',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${trade.trade_type.toUpperCase()} Entry`,
        });
        priceLinesRef.current.push(entryLine);

        // Stop Loss line (Red)
        if (stopLoss) {
          const slLine = candlestickSeriesRef.current.createPriceLine({
            price: stopLoss,
            color: '#ef4444',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: 'SL',
          });
          priceLinesRef.current.push(slLine);
        }

        // Take Profit line (Green)
        if (takeProfit) {
          const tpLine = candlestickSeriesRef.current.createPriceLine({
            price: takeProfit,
            color: '#22c55e',
            lineWidth: 2,
            lineStyle: 0,
            axisLabelVisible: true,
            title: 'TP',
          });
          priceLinesRef.current.push(tpLine);
        }
      } catch (e) {
        // Chart might be disposed
      }
    });

    return () => {
      if (!candlestickSeriesRef.current) return;
      priceLinesRef.current.forEach(line => {
        try {
          candlestickSeriesRef.current.removePriceLine(line);
        } catch (e) {
          // Ignore
        }
      });
      priceLinesRef.current = [];
    };
  }, [openTrades]);

  // Get the current/latest candle for the date display
  const latestCandle = candles[candles.length - 1];
  const currentDate = latestCandle ? new Date(latestCandle.timestamp) : null;

  const formatFullDate = (date) => {
    if (!date) return '';
    const options = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden relative" style={{
      background: 'rgba(10, 10, 10, 0.8)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
    }}>
      {/* Chart Container */}
      <div ref={chartContainerRef} className="flex-1" style={{ minHeight: '400px' }} />

      {/* Scroll to Live Button - shows when user scrolls away */}
      {!isAtLive && (
        <button
          onClick={scrollToLive}
          className="absolute bottom-16 right-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: 'rgba(139, 92, 246, 0.9)',
            color: 'white',
            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
          }}
        >
          <Radio size={14} />
          <span>Go to Live</span>
        </button>
      )}

      {/* Date/Time Bar at Bottom - TradingView style */}
      {currentDate && (
        <div
          className="flex items-center justify-between px-4 py-2 border-t"
          style={{
            background: 'rgba(139, 92, 246, 0.05)',
            borderColor: 'rgba(139, 92, 246, 0.2)',
          }}
        >
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Date:</span>
              <span className="text-purple-300 font-mono">{formatFullDate(currentDate)}</span>
            </div>
            {isAtLive && (
              <div className="flex items-center gap-1 text-green-400">
                <Radio size={10} className="animate-pulse" />
                <span className="text-xs">LIVE</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            {latestCandle && (
              <>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">O:</span>
                  <span className="text-white font-mono">${parseFloat(latestCandle.open).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">H:</span>
                  <span className="text-green-400 font-mono">${parseFloat(latestCandle.high).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">L:</span>
                  <span className="text-red-400 font-mono">${parseFloat(latestCandle.low).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">C:</span>
                  <span className={`font-mono ${parseFloat(latestCandle.close) >= parseFloat(latestCandle.open) ? 'text-green-400' : 'text-red-400'}`}>
                    ${parseFloat(latestCandle.close).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Chart;
