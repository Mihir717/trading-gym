import { useState } from 'react';
import { sessionAPI } from '../services/api';
import useStore from '../store/useStore';

function SessionSetup({ onSessionStart }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setSession = useStore((state) => state.setSession);
  const setBalance = useStore((state) => state.setBalance);

  const [formData, setFormData] = useState({
    asset: 'BTCUSDT',
    timeframe: '5m',
    initialBalance: 10000,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await sessionAPI.start(
        formData.asset,
        formData.timeframe,
        formData.initialBalance
      );

      setSession(response.data);
      setBalance(formData.initialBalance);
      onSessionStart();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="bg-bg-secondary p-8 rounded-lg border border-border max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2">Start Trading Session</h1>
        <p className="text-text-secondary mb-6">
          Choose your settings and start practicing
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Asset</label>
            <select
              value={formData.asset}
              onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded focus:outline-none focus:border-accent-green"
            >
              <option value="BTCUSDT">Bitcoin (BTCUSDT)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Timeframe</label>
            <select
              value={formData.timeframe}
              onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded focus:outline-none focus:border-accent-green"
            >
              <option value="5m">5 Minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-2">Starting Balance ($)</label>
            <input
              type="number"
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-bg-primary border border-border rounded focus:outline-none focus:border-accent-green"
              min="1000"
              step="1000"
            />
          </div>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red text-accent-red px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-green hover:bg-accent-green/90 text-white py-3 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Trading Session'}
          </button>
        </form>

        <p className="text-text-secondary text-xs mt-6">
          You'll practice with {formData.initialBalance.toLocaleString()} virtual dollars
        </p>
      </div>
    </div>
  );
}

export default SessionSetup;