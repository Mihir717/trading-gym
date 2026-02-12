module.exports = {
  testEnvironment: 'node',
  verbose: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**'
  ],
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  testTimeout: 10000
};
