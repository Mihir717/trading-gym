/**
 * Tests for the OrderPanel component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the API
const mockTradeAPIOpen = jest.fn();
jest.mock('../../services/api', () => ({
  tradeAPI: {
    open: (...args) => mockTradeAPIOpen(...args),
  },
}));

// Mock the store
const mockAddOpenTrade = jest.fn();
jest.mock('../../store/useStore', () => {
  const mockUseStore = (selector) => {
    const state = {
      session: { sessionId: 1 },
      addOpenTrade: mockAddOpenTrade,
    };
    return selector(state);
  };
  return mockUseStore;
});

import OrderPanel from '../OrderPanel';

describe('OrderPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTradeAPIOpen.mockReset();
    mockAddOpenTrade.mockReset();
  });

  describe('Rendering', () => {
    it('should render position size input with default value', () => {
      render(<OrderPanel currentPrice={50000} />);
      // Find by value since the default is 0.1
      const positionSizeInput = screen.getByDisplayValue('0.1');
      expect(positionSizeInput).toBeInTheDocument();
      expect(positionSizeInput).toHaveAttribute('type', 'number');
    });

    it('should render optional inputs (stop loss and take profit)', () => {
      render(<OrderPanel currentPrice={50000} />);
      const optionalInputs = screen.getAllByPlaceholderText('Optional');
      expect(optionalInputs).toHaveLength(2); // Stop loss and take profit
    });

    it('should render BUY and SELL buttons', () => {
      render(<OrderPanel currentPrice={50000} />);
      expect(screen.getByRole('button', { name: /buy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sell/i })).toBeInTheDocument();
    });

    it('should render labels for inputs', () => {
      render(<OrderPanel currentPrice={50000} />);
      expect(screen.getByText(/position size/i)).toBeInTheDocument();
      expect(screen.getByText(/stop loss/i)).toBeInTheDocument();
      expect(screen.getByText(/take profit/i)).toBeInTheDocument();
    });
  });

  describe('Button State', () => {
    it('should disable buttons when currentPrice is 0', () => {
      render(<OrderPanel currentPrice={0} />);
      expect(screen.getByRole('button', { name: /buy/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /sell/i })).toBeDisabled();
    });

    it('should disable buttons when currentPrice is undefined', () => {
      render(<OrderPanel />);
      expect(screen.getByRole('button', { name: /buy/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /sell/i })).toBeDisabled();
    });

    it('should enable buttons when currentPrice is valid', () => {
      render(<OrderPanel currentPrice={50000} />);
      expect(screen.getByRole('button', { name: /buy/i })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /sell/i })).not.toBeDisabled();
    });
  });

  describe('Input Handling', () => {
    it('should update position size when changed', () => {
      render(<OrderPanel currentPrice={50000} />);
      const positionSizeInput = screen.getByDisplayValue('0.1');
      fireEvent.change(positionSizeInput, { target: { value: '0.5' } });
      expect(positionSizeInput).toHaveValue(0.5);
    });
  });

  describe('Trade Submission', () => {
    it('should call API with BUY trade data when BUY button is clicked', async () => {
      mockTradeAPIOpen.mockResolvedValue({
        data: { id: 1, trade_type: 'BUY', entry_price: 50000, position_size: 0.1 },
      });

      render(<OrderPanel currentPrice={50000} />);
      fireEvent.click(screen.getByRole('button', { name: /buy/i }));

      await waitFor(() => {
        expect(mockTradeAPIOpen).toHaveBeenCalledWith(
          1, 'BUY', 50000, 0.1, null, null
        );
      });
    });

    it('should call API with SELL trade data when SELL button is clicked', async () => {
      mockTradeAPIOpen.mockResolvedValue({
        data: { id: 2, trade_type: 'SELL', entry_price: 50000, position_size: 0.1 },
      });

      render(<OrderPanel currentPrice={50000} />);
      fireEvent.click(screen.getByRole('button', { name: /sell/i }));

      await waitFor(() => {
        expect(mockTradeAPIOpen).toHaveBeenCalledWith(
          1, 'SELL', 50000, 0.1, null, null
        );
      });
    });

    it('should add trade to store on successful submission', async () => {
      const newTrade = { id: 4, trade_type: 'BUY', entry_price: 50000, position_size: 0.1 };
      mockTradeAPIOpen.mockResolvedValue({ data: newTrade });

      render(<OrderPanel currentPrice={50000} />);
      fireEvent.click(screen.getByRole('button', { name: /buy/i }));

      await waitFor(() => {
        expect(mockAddOpenTrade).toHaveBeenCalledWith(newTrade);
      });
    });

    it('should show alert on API error', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      mockTradeAPIOpen.mockRejectedValue(new Error('API Error'));

      render(<OrderPanel currentPrice={50000} />);
      fireEvent.click(screen.getByRole('button', { name: /buy/i }));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to open trade');
      });

      alertSpy.mockRestore();
    });

    it('should not call API when currentPrice is 0', () => {
      render(<OrderPanel currentPrice={0} />);
      fireEvent.click(screen.getByRole('button', { name: /buy/i }));
      expect(mockTradeAPIOpen).not.toHaveBeenCalled();
    });
  });
});
