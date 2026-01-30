import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import useStore from '../store/useStore';

function Chart({ candles }) {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candlestickSeriesRef = useRef();
  const priceLinesRef = useRef([]);
  const openTrades = useStore((state) => state.openTrades);
  const isMountedRef = useRef(true);

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
      height: 500,
      layout: {
        background: { color: '#1e293b' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current && isMountedRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
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

    try {
      candlestickSeriesRef.current.setData(formattedCandles);
    } catch (e) {
      // Chart might be disposed
    }
  }, [candles]);

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
        // Entry line (Yellow)
        const entryLine = candlestickSeriesRef.current.createPriceLine({
          price: entryPrice,
          color: '#eab308',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `Entry ${trade.trade_type}`,
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
            color: '#10b981',
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

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div ref={chartContainerRef} />
    </div>
  );
}

export default Chart;