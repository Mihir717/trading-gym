import { useState } from 'react';
import Login from './pages/Login';
import SessionSetup from './pages/SessionSetup';
import TradingDashboard from './pages/TradingDashboard';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [hasSession, setHasSession] = useState(false);

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  if (!hasSession) {
    return <SessionSetup onSessionStart={() => setHasSession(true)} />;
  }

  return <TradingDashboard />;
}

export default App;