import { useState, useEffect } from 'react';
import { sessionAPI, replayAPI } from '../services/api';
import useStore from '../store/useStore';
import { TrendingUp, Clock, DollarSign, Zap, Calendar, Info } from 'lucide-react';

function SessionSetup({ onSessionStart }) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [availableData, setAvailableData] = useState(null);
  const setSession = useStore((state) => state.setSession);
  const setBalance = useStore((state) => state.setBalance);
  const setProgressiveMode = useStore((state) => state.setProgressiveMode);

  const [formData, setFormData] = useState({
    asset: 'BTCUSDT',
    timeframe: '1h',
    initialBalance: 10000,
    progressiveMode: true,
    startDate: '',
  });

  // Available assets organized by category
  const assetCategories = [
    {
      name: 'Crypto',
      assets: [
        {
          symbol: 'BTCUSDT',
          name: 'Bitcoin',
          icon: '₿',
          color: 'from-orange-400 to-orange-600',
          description: 'Original cryptocurrency'
        },
        {
          symbol: 'ETHUSDT',
          name: 'Ethereum',
          icon: 'Ξ',
          color: 'from-blue-400 to-blue-600',
          description: 'Smart contracts'
        },
        {
          symbol: 'SOLUSDT',
          name: 'Solana',
          icon: '◎',
          color: 'from-purple-400 to-green-400',
          description: 'High-speed chain'
        }
      ]
    },
    {
      name: 'Commodities',
      assets: [
        {
          symbol: 'XAUUSD',
          name: 'Gold',
          icon: '🥇',
          color: 'from-yellow-400 to-yellow-600',
          description: 'XAU/USD'
        },
        {
          symbol: 'XAGUSD',
          name: 'Silver',
          icon: '🥈',
          color: 'from-gray-300 to-gray-500',
          description: 'XAG/USD'
        },
        {
          symbol: 'WTIUSD',
          name: 'Oil (WTI)',
          icon: '🛢️',
          color: 'from-stone-600 to-stone-800',
          description: 'Crude Oil'
        }
      ]
    },
    {
      name: 'Forex',
      assets: [
        {
          symbol: 'EURUSD',
          name: 'EUR/USD',
          icon: '€',
          color: 'from-blue-500 to-blue-700',
          description: 'Euro / Dollar'
        },
        {
          symbol: 'GBPUSD',
          name: 'GBP/USD',
          icon: '£',
          color: 'from-red-500 to-red-700',
          description: 'Pound / Dollar'
        },
        {
          symbol: 'USDJPY',
          name: 'USD/JPY',
          icon: '¥',
          color: 'from-red-400 to-white',
          description: 'Dollar / Yen'
        },
        {
          symbol: 'AUDUSD',
          name: 'AUD/USD',
          icon: 'A$',
          color: 'from-green-500 to-yellow-500',
          description: 'Aussie / Dollar'
        },
        {
          symbol: 'USDCAD',
          name: 'USD/CAD',
          icon: 'C$',
          color: 'from-red-600 to-white',
          description: 'Dollar / Loonie'
        },
        {
          symbol: 'USDCHF',
          name: 'USD/CHF',
          icon: 'Fr',
          color: 'from-red-500 to-white',
          description: 'Dollar / Franc'
        }
      ]
    }
  ];

  // State for selected category
  const [selectedCategory, setSelectedCategory] = useState('Crypto');

  const timeframes = [
    { value: '5m', label: '5 Minutes', description: 'Fast-paced scalping' },
    { value: '15m', label: '15 Minutes', description: 'Short-term trading' },
    { value: '1h', label: '1 Hour', description: 'Intraday trading' },
    { value: '4h', label: '4 Hours', description: 'Swing trading' },
    { value: '1d', label: '1 Day', description: 'Position trading' },
  ];

  // Fetch available data ranges on mount and when asset changes
  useEffect(() => {
    async function fetchAvailableData() {
      try {
        setLoadingData(true);
        const response = await replayAPI.getAvailableData(formData.asset);
        setAvailableData(response.data);

        // Set default start date to earliest available
        if (response.data.timeframes?.length > 0) {
          const tfData = response.data.timeframes.find(t => t.timeframe === formData.timeframe);
          if (tfData?.minDate) {
            // Default to a meaningful date - let's start from 2017 bull run
            const defaultDate = new Date('2017-12-01');
            const minDate = new Date(tfData.minDate);
            const startDate = defaultDate > minDate ? defaultDate : minDate;
            setFormData(prev => ({
              ...prev,
              startDate: startDate.toISOString().split('T')[0]
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch available data:', err);
        // If no data available, set availableData to null
        setAvailableData(null);
      } finally {
        setLoadingData(false);
      }
    }
    fetchAvailableData();
  }, [formData.asset]); // Re-fetch when asset changes

  // Update date range when timeframe changes
  useEffect(() => {
    if (availableData?.timeframes) {
      const tfData = availableData.timeframes.find(t => t.timeframe === formData.timeframe);
      if (tfData?.minDate && formData.startDate) {
        const currentStart = new Date(formData.startDate);
        const minDate = new Date(tfData.minDate);
        const maxDate = new Date(tfData.maxDate);

        // Ensure selected date is within valid range
        if (currentStart < minDate) {
          setFormData(prev => ({ ...prev, startDate: minDate.toISOString().split('T')[0] }));
        } else if (currentStart > maxDate) {
          setFormData(prev => ({ ...prev, startDate: maxDate.toISOString().split('T')[0] }));
        }
      }
    }
  }, [formData.timeframe, availableData]);

  const getCurrentTimeframeData = () => {
    if (!availableData?.timeframes) return null;
    return availableData.timeframes.find(t => t.timeframe === formData.timeframe);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await sessionAPI.start(
        formData.asset,
        formData.timeframe,
        formData.initialBalance,
        formData.startDate // Pass the selected start date
      );

      setSession(response.data);
      setBalance(formData.initialBalance);
      setProgressiveMode(formData.progressiveMode);
      onSessionStart();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const tfData = getCurrentTimeframeData();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)'
      }}
    >
      <div
        className="max-w-lg w-full rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 50px rgba(139, 92, 246, 0.15)'
        }}
      >
        {/* Header */}
        <div
          className="p-6 border-b"
          style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800">
              <TrendingUp className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-white">Start Trading Session</h1>
          </div>
          <p className="text-gray-400">
            Practice with real BTC historical data from 2013 to present
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Asset Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <TrendingUp size={16} className="text-purple-400" />
              Asset
            </label>

            {/* Category Tabs */}
            <div className="flex gap-2 mb-3">
              {assetCategories.map((category) => (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === category.name
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-3 gap-2">
              {assetCategories
                .find(c => c.name === selectedCategory)
                ?.assets.map((asset) => {
                  const isSelected = formData.asset === asset.symbol;
                  const assetData = availableData?.asset === asset.symbol ? availableData : null;
                  const hasData = assetData?.timeframes?.length > 0;

                  return (
                    <button
                      key={asset.symbol}
                      type="button"
                      onClick={() => setFormData({ ...formData, asset: asset.symbol })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
                      }`}
                    >
                      <div className={`w-10 h-10 mx-auto rounded-full bg-gradient-to-br ${asset.color} flex items-center justify-center text-white text-lg font-bold mb-2`}>
                        {asset.icon}
                      </div>
                      <div className={`font-medium text-xs ${isSelected ? 'text-purple-300' : 'text-gray-300'}`}>
                        {asset.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{asset.description}</div>
                      {!hasData && isSelected && (
                        <div className="text-xs text-yellow-500 mt-1">
                          No data yet
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Timeframe Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <Clock size={16} className="text-purple-400" />
              Timeframe
            </label>
            <div className="grid grid-cols-3 gap-2">
              {timeframes.map((tf) => {
                const tfInfo = availableData?.timeframes?.find(t => t.timeframe === tf.value);
                return (
                  <button
                    key={tf.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, timeframe: tf.value })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.timeframe === tf.value
                        ? 'border-purple-500 bg-purple-900/30'
                        : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
                    }`}
                  >
                    <div className={`font-medium text-sm ${formData.timeframe === tf.value ? 'text-purple-300' : 'text-gray-300'}`}>
                      {tf.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{tf.description}</div>
                    {tfInfo && (
                      <div className="text-xs text-purple-400/70 mt-1">
                        {tfInfo.totalCandles.toLocaleString()} candles
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start Date Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <Calendar size={16} className="text-purple-400" />
              Start Trading From
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                min={tfData?.minDate?.split('T')[0]}
                max={tfData?.maxDate?.split('T')[0]}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            {tfData && (
              <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-purple-900/20 border border-purple-500/20">
                <Info size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-gray-400">
                  <span className="text-purple-300 font-medium">Available data:</span>{' '}
                  {formatDate(tfData.minDate)} to {formatDate(tfData.maxDate)}
                  <br />
                  <span className="text-gray-500">
                    ({tfData.totalCandles.toLocaleString()} candles × 100 ticks each)
                  </span>
                </div>
              </div>
            )}
            {/* Quick date presets */}
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: '2013 Start', date: '2013-05-01' },
                { label: '2017 Bull', date: '2017-12-01' },
                { label: '2020 Halving', date: '2020-05-01' },
                { label: '2021 ATH', date: '2021-11-01' },
                { label: '2024', date: '2024-01-01' },
              ].map((preset) => {
                const minDate = tfData?.minDate ? new Date(tfData.minDate) : null;
                const maxDate = tfData?.maxDate ? new Date(tfData.maxDate) : null;
                const presetDate = new Date(preset.date);
                const isDisabled = minDate && (presetDate < minDate || presetDate > maxDate);

                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setFormData({ ...formData, startDate: preset.date })}
                    className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      formData.startDate === preset.date
                        ? 'bg-purple-600 text-white'
                        : isDisabled
                        ? 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Starting Balance */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <DollarSign size={16} className="text-purple-400" />
              Starting Balance
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={formData.initialBalance}
                onChange={(e) => setFormData({ ...formData, initialBalance: Number(e.target.value) })}
                className="w-full pl-8 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                min="1000"
                step="1000"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[5000, 10000, 25000, 50000].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setFormData({ ...formData, initialBalance: amount })}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    formData.initialBalance === amount
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  ${amount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Progressive Mode Toggle */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <Zap size={16} className="text-purple-400" />
              Candle Formation Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, progressiveMode: true })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  formData.progressiveMode
                    ? 'border-purple-500 bg-purple-900/30'
                    : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
                }`}
              >
                <div className={`font-medium ${formData.progressiveMode ? 'text-purple-300' : 'text-gray-300'}`}>
                  Progressive
                </div>
                <div className="text-xs text-gray-500 mt-1">100 ticks per candle</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, progressiveMode: false })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  !formData.progressiveMode
                    ? 'border-purple-500 bg-purple-900/30'
                    : 'border-gray-800 bg-gray-900/30 hover:border-gray-700'
                }`}
              >
                <div className={`font-medium ${!formData.progressiveMode ? 'text-purple-300' : 'text-gray-300'}`}>
                  Instant
                </div>
                <div className="text-xs text-gray-500 mt-1">Full candles at once</div>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || loadingData}
            className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
              boxShadow: '0 10px 40px -10px rgba(139, 92, 246, 0.5)'
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting Session...
              </span>
            ) : loadingData ? (
              'Loading data...'
            ) : (
              'Start Trading Session'
            )}
          </button>
        </form>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t text-center"
          style={{ borderColor: 'rgba(139, 92, 246, 0.1)' }}
        >
          <p className="text-gray-500 text-sm">
            Start from <span className="text-purple-400 font-medium">{formatDate(formData.startDate)}</span> with{' '}
            <span className="text-purple-400 font-medium">${formData.initialBalance.toLocaleString()}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SessionSetup;
