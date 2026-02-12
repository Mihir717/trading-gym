/**
 * Tests for the main App component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock child components
jest.mock('./pages/Login', () => {
  return function MockLogin({ onLoginSuccess }) {
    return (
      <div data-testid="login-page">
        <button onClick={onLoginSuccess} data-testid="login-button">
          Mock Login
        </button>
      </div>
    );
  };
});

jest.mock('./pages/SessionSetup', () => {
  return function MockSessionSetup({ onSessionStart }) {
    return (
      <div data-testid="session-setup-page">
        <button onClick={onSessionStart} data-testid="start-session-button">
          Start Session
        </button>
      </div>
    );
  };
});

jest.mock('./pages/TradingDashboard', () => {
  return function MockTradingDashboard() {
    return <div data-testid="trading-dashboard">Trading Dashboard</div>;
  };
});

describe('App', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Authentication Flow', () => {
    it('should render Login page when user is not authenticated', () => {
      render(<App />);

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('should render SessionSetup page when user is authenticated but has no session', () => {
      // Set token to simulate logged in user
      localStorage.setItem('token', 'fake-jwt-token');

      render(<App />);

      expect(screen.getByTestId('session-setup-page')).toBeInTheDocument();
    });

    it('should transition from Login to SessionSetup on successful login', () => {
      render(<App />);

      // Verify we start on login page
      expect(screen.getByTestId('login-page')).toBeInTheDocument();

      // Click the mock login button
      fireEvent.click(screen.getByTestId('login-button'));

      // Should now show session setup
      expect(screen.getByTestId('session-setup-page')).toBeInTheDocument();
    });

    it('should transition from SessionSetup to TradingDashboard on session start', () => {
      localStorage.setItem('token', 'fake-jwt-token');

      render(<App />);

      // Verify we start on session setup
      expect(screen.getByTestId('session-setup-page')).toBeInTheDocument();

      // Click the start session button
      fireEvent.click(screen.getByTestId('start-session-button'));

      // Should now show trading dashboard
      expect(screen.getByTestId('trading-dashboard')).toBeInTheDocument();
    });
  });

  describe('Full User Journey', () => {
    it('should complete full flow from login to trading dashboard', () => {
      render(<App />);

      // Step 1: Login
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('login-button'));

      // Step 2: Session Setup
      expect(screen.getByTestId('session-setup-page')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('start-session-button'));

      // Step 3: Trading Dashboard
      expect(screen.getByTestId('trading-dashboard')).toBeInTheDocument();
    });
  });

  describe('Initial State based on Token', () => {
    it('should check localStorage for existing token on mount', () => {
      const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');

      render(<App />);

      expect(getItemSpy).toHaveBeenCalledWith('token');
      getItemSpy.mockRestore();
    });

    it('should be logged in if token exists in localStorage', () => {
      localStorage.setItem('token', 'existing-token');

      render(<App />);

      // Should skip login page
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('session-setup-page')).toBeInTheDocument();
    });

    it('should not be logged in if token is empty string', () => {
      localStorage.setItem('token', '');

      render(<App />);

      // Should show login page because empty string is falsy
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  describe('Page Exclusivity', () => {
    it('should only show one page at a time', () => {
      render(<App />);

      // Only login should be visible
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('session-setup-page')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trading-dashboard')).not.toBeInTheDocument();
    });

    it('should not show login after authentication', () => {
      localStorage.setItem('token', 'fake-token');

      render(<App />);

      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
      expect(screen.getByTestId('session-setup-page')).toBeInTheDocument();
    });
  });
});
