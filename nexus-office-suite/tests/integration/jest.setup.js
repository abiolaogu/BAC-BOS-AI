const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.test' });

// Global setup
beforeAll(async () => {
  console.log('Starting integration test suite...');
});

// Global teardown
afterAll(async () => {
  console.log('Integration test suite completed');
});

// Increase timeout for integration tests
jest.setTimeout(30000);
