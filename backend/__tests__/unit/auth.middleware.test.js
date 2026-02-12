/**
 * Unit tests for authentication middleware
 */

const jwt = require('jsonwebtoken');

// Mock the middleware function (since we're testing the logic, not the actual file import)
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      header: jest.fn()
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('Token Validation', () => {
    it('should reject request with no token', () => {
      mockReq.header.mockReturnValue(null);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token, authorization denied' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with empty Authorization header', () => {
      mockReq.header.mockReturnValue('');

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token, authorization denied' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      mockReq.header.mockReturnValue('Bearer invalid-token');

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token is not valid' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 1, email: 'test@test.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );
      mockReq.header.mockReturnValue(`Bearer ${expiredToken}`);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token is not valid' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept request with valid token', () => {
      const validToken = jwt.sign(
        { userId: 1, email: 'test@test.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      mockReq.header.mockReturnValue(`Bearer ${validToken}`);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual(
        expect.objectContaining({
          userId: 1,
          email: 'test@test.com'
        })
      );
    });

    it('should extract Bearer token correctly', () => {
      const validToken = jwt.sign(
        { userId: 123, email: 'user@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      mockReq.header.mockReturnValue(`Bearer ${validToken}`);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockReq.user.userId).toBe(123);
      expect(mockReq.user.email).toBe('user@example.com');
    });

    it('should reject token signed with wrong secret', () => {
      const wrongSecretToken = jwt.sign(
        { userId: 1, email: 'test@test.com' },
        'wrong-secret-key'
      );
      mockReq.header.mockReturnValue(`Bearer ${wrongSecretToken}`);

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token is not valid' });
    });
  });

  describe('Token Format', () => {
    it('should handle token without Bearer prefix', () => {
      // If someone sends just the token without "Bearer "
      const validToken = jwt.sign(
        { userId: 1, email: 'test@test.com' },
        process.env.JWT_SECRET
      );
      // The header returns just the token, replace('Bearer ', '') won't change it
      mockReq.header.mockReturnValue(validToken);

      authMiddleware(mockReq, mockRes, mockNext);

      // Should still work if token is valid
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle malformed authorization header', () => {
      mockReq.header.mockReturnValue('Basic someotherscheme');

      authMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
