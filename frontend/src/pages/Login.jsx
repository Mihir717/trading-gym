import { useState } from 'react';
import { authAPI } from '../services/api';
import useStore from '../store/useStore';

function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const setUser = useStore((state) => state.setUser);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = isLogin 
        ? await authAPI.login(email, password)
        : await authAPI.register(email, password);
      
      const { token, user } = response.data;
      setUser(user, token);
      onLoginSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #000000 0%, #1a0033 50%, #000000 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative'
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: 'absolute',
        top: '25%',
        left: '25%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        filter: 'blur(60px)',
        animation: 'pulse 4s infinite',
        pointerEvents: 'none'
      }}></div>
      
      <div style={{
        position: 'absolute',
        bottom: '25%',
        right: '25%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        filter: 'blur(60px)',
        animation: 'pulse 4s infinite 700ms',
        pointerEvents: 'none'
      }}></div>

      {/* Login Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '450px'
      }}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(20px)',
          padding: '2rem',
          borderRadius: '1rem',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Logo/Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              borderRadius: '12px',
              marginBottom: '1rem'
            }}>
              <svg style={{ width: '32px', height: '32px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #ffffff, #e9d5ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              Trading Gym
            </h1>
            <p style={{ color: '#c4b5fd', fontSize: '0.875rem' }}>
              Master your trading skills, risk-free
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            background: 'rgba(88, 28, 135, 0.2)',
            padding: '0.25rem',
            borderRadius: '0.5rem'
          }}>
            <button
              onClick={() => setIsLogin(true)}
              style={{
                flex: 1,
                padding: '0.625rem',
                borderRadius: '0.375rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: isLogin ? 'linear-gradient(to right, #8b5cf6, #7c3aed)' : 'transparent',
                color: isLogin ? 'white' : '#c4b5fd',
                boxShadow: isLogin ? '0 10px 15px -3px rgba(139, 92, 246, 0.3)' : 'none'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              style={{
                flex: 1,
                padding: '0.625rem',
                borderRadius: '0.375rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: !isLogin ? 'linear-gradient(to right, #8b5cf6, #7c3aed)' : 'transparent',
                color: !isLogin ? 'white' : '#c4b5fd',
                boxShadow: !isLogin ? '0 10px 15px -3px rgba(139, 92, 246, 0.3)' : 'none'
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#e9d5ff', marginBottom: '0.5rem' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(88, 28, 135, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.2)'}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#e9d5ff', marginBottom: '0.5rem' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'rgba(88, 28, 135, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '0.5rem',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.2)'}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(to right, #8b5cf6, #7c3aed)',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontWeight: 500,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3)',
                transition: 'all 0.2s',
                fontSize: '1rem'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.boxShadow = '0 20px 25px -5px rgba(139, 92, 246, 0.5)')}
              onMouseLeave={(e) => e.target.style.boxShadow = '0 10px 15px -3px rgba(139, 92, 246, 0.3)'}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Demo Account */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(139, 92, 246, 0.1)'
          }}>
            <p style={{ color: 'rgba(196, 181, 253, 0.5)', fontSize: '0.75rem', textAlign: 'center' }}>
              <span style={{ display: 'block', marginBottom: '0.25rem' }}>Demo Account:</span>
              <span style={{ fontFamily: 'monospace' }}>test@tradinggym.com / password123</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: 'rgba(196, 181, 253, 0.4)', fontSize: '0.75rem', textAlign: 'center', marginTop: '1.5rem' }}>
          Practice trading in a simulated environment. No real money involved.
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

export default Login;