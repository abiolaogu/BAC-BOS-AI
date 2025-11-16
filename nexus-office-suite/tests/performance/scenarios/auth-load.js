import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Authentication Load Test
 * Tests authentication endpoints under load
 */

// Custom metrics
const loginErrorRate = new Rate('login_errors');
const registerErrorRate = new Rate('register_errors');
const loginDuration = new Trend('login_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 200 },  // Spike to 200 users
    { duration: '2m', target: 200 },  // Stay at 200 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    login_errors: ['rate<0.05'],                     // Login errors < 5%
    register_errors: ['rate<0.05'],                  // Register errors < 5%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';

export default function () {
  const userId = `user_${__VU}_${__ITER}`;
  const email = `${userId}@example.com`;
  const password = 'TestPassword123!';

  // Test: User Registration
  const registerPayload = JSON.stringify({
    name: `Test User ${userId}`,
    email: email,
    password: password,
  });

  const registerParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    registerPayload,
    registerParams
  );

  const registerSuccess = check(registerRes, {
    'register: status is 201': (r) => r.status === 201,
    'register: has token': (r) => r.json('token') !== undefined,
    'register: has user': (r) => r.json('user') !== undefined,
  });

  registerErrorRate.add(!registerSuccess);

  sleep(1);

  // Test: User Login
  const loginPayload = JSON.stringify({
    email: email,
    password: password,
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginStart = new Date();
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    loginPayload,
    loginParams
  );
  const loginEnd = new Date();
  const loginTime = loginEnd - loginStart;

  loginDuration.add(loginTime);

  const loginSuccess = check(loginRes, {
    'login: status is 200': (r) => r.status === 200,
    'login: has token': (r) => r.json('token') !== undefined,
    'login: response time < 500ms': () => loginTime < 500,
  });

  loginErrorRate.add(!loginSuccess);

  const token = loginRes.json('token');

  sleep(1);

  // Test: Get Current User
  const meParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const meRes = http.get(`${BASE_URL}/api/auth/me`, meParams);

  check(meRes, {
    'me: status is 200': (r) => r.status === 200,
    'me: has user data': (r) => r.json('user') !== undefined,
    'me: email matches': (r) => r.json('user.email') === email,
  });

  sleep(1);

  // Test: Logout
  const logoutRes = http.post(`${BASE_URL}/api/auth/logout`, null, meParams);

  check(logoutRes, {
    'logout: status is 200': (r) => r.status === 200,
  });

  sleep(2);
}

export function handleSummary(data) {
  return {
    'summary-auth.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const { indent = '', enableColors = false } = options || {};
  let summary = '\n';

  summary += `${indent}Test Summary:\n`;
  summary += `${indent}  Duration: ${data.metrics.iteration_duration.values.avg.toFixed(2)}ms avg\n`;
  summary += `${indent}  Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Errors: ${data.metrics.http_req_failed.values.rate * 100}%\n`;
  summary += `${indent}  p95: ${data.metrics.http_req_duration.values.p95.toFixed(2)}ms\n`;
  summary += `${indent}  p99: ${data.metrics.http_req_duration.values.p99.toFixed(2)}ms\n`;

  return summary;
}
