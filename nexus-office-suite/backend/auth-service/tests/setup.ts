/**
 * Jest Test Setup
 * This file runs before each test file
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests-only-min-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-unit-tests-only-min-32';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'nexus_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.MFA_ISSUER = 'NEXUS Test';

// Increase test timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
beforeAll(() => {
  // Setup code that runs once before all tests
});

afterAll(() => {
  // Cleanup code that runs once after all tests
});

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Suppress console output during tests (optional)
// Uncomment the following lines to suppress console output:
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
