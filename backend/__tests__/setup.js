// Set up environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(() => {
  // Silence console during tests (optional - uncomment to reduce noise)
  // jest.spyOn(console, 'log').mockImplementation(() => {});
  // jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  // Clean up
  jest.restoreAllMocks();
});
