/**
 * Tests for the API service layer
 * These tests verify the API contract and function signatures
 */

describe('API Service Contract', () => {
  let authAPI, sessionAPI, replayAPI, tradeAPI;

  beforeEach(() => {
    jest.resetModules();

    // Mock axios before importing the api module
    jest.doMock('axios', () => {
      const mockInstance = {
        post: jest.fn().mockResolvedValue({ data: {} }),
        get: jest.fn().mockResolvedValue({ data: {} }),
        put: jest.fn().mockResolvedValue({ data: {} }),
        interceptors: {
          request: {
            use: jest.fn(),
          },
        },
      };
      return {
        create: jest.fn(() => mockInstance),
        ...mockInstance,
      };
    });

    // Import the APIs after mocking
    const api = require('../api');
    authAPI = api.authAPI;
    sessionAPI = api.sessionAPI;
    replayAPI = api.replayAPI;
    tradeAPI = api.tradeAPI;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authAPI', () => {
    it('should export register function', () => {
      expect(typeof authAPI.register).toBe('function');
    });

    it('should export login function', () => {
      expect(typeof authAPI.login).toBe('function');
    });

    it('register should accept email and password', async () => {
      // The function should accept these parameters without throwing
      await expect(authAPI.register('test@test.com', 'password123')).resolves.toBeDefined();
    });

    it('login should accept email and password', async () => {
      await expect(authAPI.login('test@test.com', 'password123')).resolves.toBeDefined();
    });
  });

  describe('sessionAPI', () => {
    it('should export start function', () => {
      expect(typeof sessionAPI.start).toBe('function');
    });

    it('should export get function', () => {
      expect(typeof sessionAPI.get).toBe('function');
    });

    it('start should accept asset, timeframe, and initialBalance', async () => {
      await expect(sessionAPI.start('BTCUSDT', '1h', 10000)).resolves.toBeDefined();
    });

    it('get should accept sessionId', async () => {
      await expect(sessionAPI.get(1)).resolves.toBeDefined();
    });
  });

  describe('replayAPI', () => {
    it('should export getCandles function', () => {
      expect(typeof replayAPI.getCandles).toBe('function');
    });

    it('getCandles should accept sessionId with default offset and limit', async () => {
      await expect(replayAPI.getCandles(1)).resolves.toBeDefined();
    });

    it('getCandles should accept custom offset and limit', async () => {
      await expect(replayAPI.getCandles(1, 50, 25)).resolves.toBeDefined();
    });
  });

  describe('tradeAPI', () => {
    it('should export open function', () => {
      expect(typeof tradeAPI.open).toBe('function');
    });

    it('should export close function', () => {
      expect(typeof tradeAPI.close).toBe('function');
    });

    it('should export getSessionTrades function', () => {
      expect(typeof tradeAPI.getSessionTrades).toBe('function');
    });

    it('open should accept all trade parameters', async () => {
      await expect(
        tradeAPI.open(1, 'BUY', 50000, 0.1, 49000, 52000)
      ).resolves.toBeDefined();
    });

    it('open should accept null SL/TP', async () => {
      await expect(
        tradeAPI.open(1, 'SELL', 50000, 0.1, null, null)
      ).resolves.toBeDefined();
    });

    it('close should accept tradeId and exitPrice', async () => {
      await expect(tradeAPI.close(1, 51000)).resolves.toBeDefined();
    });

    it('getSessionTrades should accept sessionId', async () => {
      await expect(tradeAPI.getSessionTrades(1)).resolves.toBeDefined();
    });
  });
});

describe('Token Interceptor Logic', () => {
  // Test the interceptor logic in isolation
  const createInterceptor = () => {
    return (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    };
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('should add Authorization header when token exists', () => {
    localStorage.setItem('token', 'test-jwt-token');
    const interceptor = createInterceptor();

    const config = { headers: {} };
    const result = interceptor(config);

    expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
  });

  it('should not add Authorization header when no token', () => {
    const interceptor = createInterceptor();

    const config = { headers: {} };
    const result = interceptor(config);

    expect(result.headers.Authorization).toBeUndefined();
  });

  it('should preserve existing headers', () => {
    localStorage.setItem('token', 'test-token');
    const interceptor = createInterceptor();

    const config = {
      headers: { 'Content-Type': 'application/json' },
    };
    const result = interceptor(config);

    expect(result.headers['Content-Type']).toBe('application/json');
    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  it('should create headers object if not present', () => {
    localStorage.setItem('token', 'test-token');
    const interceptor = createInterceptor();

    const config = {};
    const result = interceptor(config);

    expect(result.headers.Authorization).toBe('Bearer test-token');
  });
});
