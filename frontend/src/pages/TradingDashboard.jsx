import { useState, useEffect } from 'react';
import { replayAPI } from '../services/api';
import useStore from '../store/useStore';
import Chart from '../components/Chart';
import ReplayControls from '../components/ReplayControls';
import OrderPanel from '../components/OrderPanel';
import PositionsList from '../components/PositionsList';
import MetricsPanel from '../components/MetricsPanel';
import TradeHistory from '../components/TradeHistory';
import EquityCurve from '../components/EquityCurve';
import { ChevronUp, ChevronDown, X, BarChart3 } from 'lucide-react';

function TradingDashboard() {
  const session = useStore((state) => state.session);
  const candles = useStore((state) => state.candles);
  const setCandles = useStore((state) => state.setCandles);
  const currentCandleIndex = useStore((state) => state.currentCandleIndex);
  const logout = useStore((state) => state.logout);
  const balance = useStore((state) => state.balance);
  const openTrades = useStore((state) => state.openTrades);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trading');
  const [showOrderPanel, setShowOrderPanel] = useState(true);
  const [showBottomDrawer, setShowBottomDrawer] = useState(false);

  useEffect(() => {
    loadCandles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCandles = async () => {
    try {
      const response = await replayAPI.getCandles(session.sessionId, 0, 1000);
      setCandles(response.data.candles);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load candles:', error);
      setLoading(false);
    }
  };

  const currentPrice = Number(candles[currentCandleIndex]?.close) || 0;
  const visibleCandles = candles.slice(0, currentCandleIndex + 1);
  const safeBalance = Number(balance) || 0;

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#000000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#ffffff'
      }}>
        <div style={{ fontSize: '1.5rem' }}>Loading market data...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      background: '#000000',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{
        height: '50px',
        background: '#0a0a0a',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#8b5cf6' }}>Trading Gym</h1>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#666' }}>
            <span>{session.asset}</span>
            <span>•</span>
            <span>{session.timeframe}</span>
            <span>•</span>
            <span style={{ color: safeBalance >= 10000 ? '#10b981' : '#ef4444' }}>
              ${safeBalance.toFixed(2)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab(activeTab === 'trading' ? 'history' : 'trading')}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === 'history' ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '0.375rem',
              color: '#8b5cf6',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <BarChart3 size={16} />
            {activeTab === 'trading' ? 'Analytics' : 'Trading'}
          </button>

          <button
            onClick={logout}
            style={{
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '0.375rem',
              color: '#999',
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'trading' ? (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {/* Chart */}
          <div style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: showOrderPanel ? '340px' : 0,
            bottom: showBottomDrawer ? '300px' : '60px',
            padding: '1rem',
            transition: 'all 0.3s ease'
          }}>
            <Chart candles={visibleCandles} />
          </div>

          {/* Replay Controls */}
          <div style={{
            position: 'absolute',
            bottom: showBottomDrawer ? '310px' : '70px',
            left: '1rem',
            zIndex: 50,
            transition: 'bottom 0.3s ease'
          }}>
            <ReplayControls />
          </div>

          {/* Right Panel */}
          {showOrderPanel && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '340px',
              height: '100%',
              background: '#0a0a0a',
              borderLeft: '1px solid rgba(139, 92, 246, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 60
            }}>
              <div style={{
                padding: '1rem',
                borderBottom: '1px solid #1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#8b5cf6' }}>
                  Quick Trade
                </span>
                <button
                  onClick={() => setShowOrderPanel(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                <OrderPanel currentPrice={currentPrice} />
                <div style={{ marginTop: '1rem' }}>
                  <MetricsPanel />
                </div>
              </div>
            </div>
          )}

          {/* Show Panel Button */}
          {!showOrderPanel && (
            <button
              onClick={() => setShowOrderPanel(true)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                padding: '0.75rem',
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                borderRadius: '0.5rem',
                color: '#8b5cf6',
                cursor: 'pointer',
                zIndex: 50
              }}
            >
              Quick Trade
            </button>
          )}

          {/* Bottom Drawer */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: showBottomDrawer ? '300px' : '60px',
            background: '#0a0a0a',
            borderTop: '1px solid rgba(139, 92, 246, 0.15)',
            zIndex: 90,
            transition: 'height 0.3s ease',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <button 
              onClick={() => setShowBottomDrawer(!showBottomDrawer)}
              style={{
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderBottom: '1px solid #1a1a1a',
                background: '#0a0a0a',
                border: 'none',
                color: '#666',
                fontSize: '0.875rem',
                width: '100%',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {showBottomDrawer ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                <span>Open Positions ({openTrades.length})</span>
                {showBottomDrawer ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </div>
            </button>

            <div style={{ 
              flex: 1, 
              overflow: 'auto',
              padding: showBottomDrawer ? '1rem' : 0,
              opacity: showBottomDrawer ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}>
              {showBottomDrawer && <PositionsList currentPrice={currentPrice} />}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto', padding: '2rem', background: '#000000' }}>
          <EquityCurve />
          <div style={{ marginTop: '2rem' }}>
            <TradeHistory />
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingDashboard;