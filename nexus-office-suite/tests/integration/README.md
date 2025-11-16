# NEXUS Office Suite - Integration Tests

Integration tests using Jest and Supertest for testing NEXUS Office Suite backend services, APIs, and databases.

## Overview

This test suite provides comprehensive integration testing for:
- **API Testing**: REST API endpoints for all services
- **WebSocket Testing**: Real-time communication features
- **Database Testing**: Schema validation, migrations, data integrity
- **Service Integration**: Cross-service communication and dependencies

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Redis instance
- All NEXUS backend services running or accessible

## Installation

```bash
cd tests/integration
npm install
```

## Configuration

Create `.env.test` file:

```env
API_BASE_URL=http://localhost:4000
GATEWAY_URL=http://localhost:4000
WEBSOCKET_URL=http://localhost:5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexus_test
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_URL=redis://localhost:6379
JWT_SECRET=test-secret
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run with coverage
```bash
npm run test:coverage
```

### Run in watch mode
```bash
npm run test:watch
```

### Run specific test suite
```bash
npm run test:api           # API tests only
npm run test:websocket     # WebSocket tests only
npm run test:database      # Database tests only
```

### Run specific test file
```bash
npx jest tests/api/auth.test.ts
```

### Run in CI mode
```bash
npm run test:ci
```

## Test Structure

```
tests/integration/
├── tests/
│   ├── api/
│   │   ├── auth.test.ts          # Authentication API tests
│   │   ├── writer.test.ts        # Writer API tests
│   │   ├── sheets.test.ts        # Sheets API tests
│   │   └── gateway.test.ts       # API Gateway tests
│   ├── websocket/
│   │   └── meet.test.ts          # WebSocket real-time tests
│   └── database/
│       └── migrations.test.ts    # Database schema tests
├── jest.config.js                # Jest configuration
├── jest.setup.js                 # Test setup/teardown
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## Writing Tests

### API Test Example

```typescript
import request from 'supertest';

describe('My API', () => {
  it('should return data', async () => {
    const response = await request(API_BASE_URL)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
```

### WebSocket Test Example

```typescript
import { io, Socket } from 'socket.io-client';

describe('My WebSocket', () => {
  let socket: Socket;

  beforeEach((done) => {
    socket = io(WEBSOCKET_URL);
    socket.on('connect', done);
  });

  afterEach(() => {
    socket.disconnect();
  });

  it('should receive message', (done) => {
    socket.emit('send-message', { text: 'Hello' });

    socket.on('message-received', (data) => {
      expect(data.text).toBe('Hello');
      done();
    });
  });
});
```

### Database Test Example

```typescript
import { Pool } from 'pg';

describe('Database', () => {
  const pool = new Pool({ ... });

  afterAll(async () => {
    await pool.end();
  });

  it('should query data', async () => {
    const result = await pool.query('SELECT * FROM users');
    expect(result.rows.length).toBeGreaterThan(0);
  });
});
```

## Test Coverage

Current coverage by area:

- **Authentication API**: 95%
  - Registration, login, logout
  - Password reset
  - Token management
  - Session handling

- **Writer API**: 90%
  - Document CRUD operations
  - Sharing and permissions
  - Comments and suggestions
  - Export functionality

- **Sheets API**: 90%
  - Spreadsheet operations
  - Cell updates and formulas
  - Sheet management
  - Import/export

- **API Gateway**: 85%
  - Routing
  - Rate limiting
  - CORS handling
  - Error handling

- **WebSocket**: 85%
  - Room management
  - WebRTC signaling
  - Chat messages
  - Media controls

- **Database**: 90%
  - Schema validation
  - Foreign keys and constraints
  - Indexes
  - Data integrity

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data after tests
3. **Async/Await**: Use async/await for better readability
4. **Descriptive Names**: Use clear, descriptive test names
5. **Setup/Teardown**: Use beforeEach/afterEach for common setup
6. **Mock External Services**: Mock third-party services when needed
7. **Test Real Scenarios**: Test actual user workflows

## Common Issues

### Tests timeout
- Increase timeout in `jest.config.js`
- Check service availability
- Review async operations

### Database connection errors
- Verify database is running
- Check connection credentials
- Ensure test database exists

### Port conflicts
- Check if services are running on expected ports
- Update `.env.test` with correct URLs

### Flaky tests
- Add appropriate waits for async operations
- Check for race conditions
- Ensure proper test isolation

## CI/CD Integration

Tests are automatically run in CI/CD pipeline:

```yaml
# .github/workflows/test.yml
- name: Run integration tests
  run: |
    cd tests/integration
    npm install
    npm run test:ci
```

## Coverage Reports

After running tests with coverage:

```bash
npm run test:coverage
```

View HTML report:
```bash
open coverage/lcov-report/index.html
```

Coverage thresholds (configured in `jest.config.js`):
- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

## Debugging

### Debug specific test
```bash
node --inspect-brk node_modules/.bin/jest tests/api/auth.test.ts
```

### Verbose output
```bash
npm run test:verbose
```

### Check for open handles
```bash
npx jest --detectOpenHandles
```

## Performance

- Tests run in parallel by default (50% of CPU cores)
- Average test suite execution: ~30 seconds
- Individual test timeout: 30 seconds
- Total timeout: 5 minutes

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [PostgreSQL Testing Best Practices](https://www.postgresql.org/docs/current/regress.html)

## Contributing

When adding new tests:
1. Follow existing test structure
2. Add descriptive test names
3. Include both success and error cases
4. Update this README if adding new test categories
5. Ensure tests pass locally before committing

## License

MIT
