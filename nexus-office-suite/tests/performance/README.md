# NEXUS Performance Tests

Performance and load testing suite using k6 for the NEXUS Office Suite.

## Overview

Comprehensive performance testing covering:
- **Authentication Load**: User registration and login under load
- **API Stress**: REST API endpoints under heavy traffic
- **WebSocket Concurrency**: Real-time features with many concurrent users
- **File Upload**: Large file upload performance

## Prerequisites

- k6 installed (`brew install k6` or see [k6 installation](https://k6.io/docs/getting-started/installation/))
- NEXUS services running and accessible

## Installation

```bash
cd tests/performance
npm install
```

## Running Tests

### Run all performance tests
```bash
npm run test:all
```

### Run specific test scenarios
```bash
npm run test:auth        # Authentication load test
npm run test:api         # API stress test
npm run test:websocket   # WebSocket concurrency test
npm run test:upload      # File upload test
```

### Run with custom configuration
```bash
API_BASE_URL=https://staging.nexus.com k6 run scenarios/api-stress.js
```

### Run with cloud reporting
```bash
npm run report
```

## Test Scenarios

### 1. Authentication Load Test
**File**: `scenarios/auth-load.js`

Tests authentication endpoints with ramping load:
- 50 → 100 → 200 concurrent users
- Registration, login, token validation
- **Thresholds**: p95 < 500ms, p99 < 1s, error rate < 1%

### 2. API Stress Test
**File**: `scenarios/api-stress.js`

Multi-scenario stress test:
- Constant load (50 VUs for 5min)
- Ramping load (0 → 200 VUs over 12min)
- Spike test (0 → 500 → 0 VUs in 1.5min)

Tests:
- Document creation, listing, retrieval
- Search functionality
- **Thresholds**: p95 < 1s, p99 < 2s, error rate < 2%

### 3. WebSocket Concurrency
**File**: `scenarios/websocket-concurrent.js`

Tests real-time features:
- Meeting join/leave
- Simultaneous message sending
- **Target**: 100+ concurrent connections

### 4. File Upload Performance
**File**: `scenarios/file-upload.js`

Tests file upload with various sizes:
- Small files (< 1MB)
- Medium files (1-10MB)
- Large files (10-100MB)
- **Thresholds**: p95 < 5s for small files

## Metrics

### Built-in Metrics
- `http_req_duration`: Request duration
- `http_req_failed`: Failed requests rate
- `http_reqs`: Total requests
- `iterations`: Completed iterations
- `vus`: Virtual users

### Custom Metrics
- `login_errors`: Login failure rate
- `register_errors`: Registration failure rate
- `document_creation_time`: Document creation latency
- `documents_created`: Successfully created documents
- `websocket_connections`: Active WebSocket connections
- `upload_duration`: File upload time

## Thresholds

Default performance thresholds:

```javascript
{
  http_req_duration: ['p(95)<1000', 'p(99)<2000'],
  http_req_failed: ['rate<0.02'],
  api_errors: ['rate<0.05'],
}
```

## Results

### View Results
Results are printed to stdout and saved to JSON files:
- `summary-auth.json`
- `summary-api.json`
- `summary-websocket.json`
- `summary-upload.json`

### Example Output
```
========= API STRESS TEST SUMMARY =========

Duration: 300.00s
Total Requests: 45000
Failed Requests: 0.5%
Documents Created: 22500

Response Times:
  Average: 234.56ms
  Median: 198.23ms
  p95: 567.89ms
  p99: 892.34ms
  Max: 1543.21ms

===========================================
```

## Performance Benchmarks

### Authentication Service
- **Login**: p95 < 300ms
- **Registration**: p95 < 500ms
- **Token validation**: p95 < 100ms
- **Concurrent users**: 200+

### Writer Service
- **Create document**: p95 < 800ms
- **List documents**: p95 < 500ms
- **Update document**: p95 < 700ms
- **Concurrent operations**: 150+

### Sheets Service
- **Create spreadsheet**: p95 < 1000ms
- **Cell updates**: p95 < 300ms
- **Formula calculation**: p95 < 500ms
- **Concurrent users**: 100+

### WebSocket (Meet)
- **Join meeting**: p95 < 2s
- **Send message**: p95 < 100ms
- **Concurrent connections**: 100+

## Best Practices

1. **Warm Up**: Always include ramp-up stages
2. **Realistic Load**: Match production usage patterns
3. **Monitor Resources**: Watch CPU, memory, database connections
4. **Baseline First**: Establish performance baselines
5. **Incremental Testing**: Test changes incrementally
6. **Clean Data**: Clean up test data between runs

## Troubleshooting

### High error rates
- Check service logs
- Verify database connections
- Check rate limiting
- Review resource utilization

### Slow response times
- Check database query performance
- Review API endpoint logic
- Check network latency
- Monitor cache hit rates

### Connection errors
- Verify service availability
- Check connection pool sizes
- Review timeout settings
- Monitor file descriptor limits

## CI/CD Integration

Run in CI pipeline:

```bash
k6 run --quiet --out json=results.json scenarios/api-stress.js
```

Parse results:
```bash
k6 inspect results.json
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Cloud](https://k6.io/cloud/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/)

## License

MIT
