import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * API Stress Test
 * Tests API endpoints under heavy load
 */

// Custom metrics
const apiErrors = new Rate('api_errors');
const documentCreationTime = new Trend('document_creation_time');
const documentsCreated = new Counter('documents_created');

export const options = {
  scenarios: {
    // Constant load scenario
    constant_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
    // Ramping scenario
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      startTime: '5m',
    },
    // Spike scenario
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },  // Fast ramp up
        { duration: '1m', target: 500 },   // Hold
        { duration: '10s', target: 0 },    // Fast ramp down
      ],
      startTime: '14m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
    api_errors: ['rate<0.05'],
    document_creation_time: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';

// Setup: Create user and get token
export function setup() {
  const email = `perf-test-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      name: 'Performance Test User',
      email: email,
      password: password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  return {
    token: registerRes.json('token'),
  };
}

export default function (data) {
  const { token } = data;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test: Create Document
  group('Create Document', function () {
    const createStart = new Date();
    const createRes = http.post(
      `${BASE_URL}/api/writer/documents`,
      JSON.stringify({
        title: `Document ${__VU}_${__ITER}`,
        content: 'Test content for performance testing',
      }),
      { headers }
    );
    const createTime = new Date() - createStart;

    documentCreationTime.add(createTime);

    const createSuccess = check(createRes, {
      'create: status is 201': (r) => r.status === 201,
      'create: has document': (r) => r.json('document') !== undefined,
      'create: response time < 2s': () => createTime < 2000,
    });

    if (createSuccess) {
      documentsCreated.add(1);
    }

    apiErrors.add(!createSuccess);
  });

  sleep(0.5);

  // Test: List Documents
  group('List Documents', function () {
    const listRes = http.get(`${BASE_URL}/api/writer/documents`, { headers });

    const listSuccess = check(listRes, {
      'list: status is 200': (r) => r.status === 200,
      'list: has documents array': (r) => Array.isArray(r.json('documents')),
    });

    apiErrors.add(!listSuccess);
  });

  sleep(0.5);

  // Test: Get Specific Document
  group('Get Document', function () {
    // First create a document
    const createRes = http.post(
      `${BASE_URL}/api/writer/documents`,
      JSON.stringify({
        title: `Get Test Doc ${__VU}_${__ITER}`,
        content: 'Content',
      }),
      { headers }
    );

    if (createRes.status === 201) {
      const docId = createRes.json('document.id');

      const getRes = http.get(
        `${BASE_URL}/api/writer/documents/${docId}`,
        { headers }
      );

      const getSuccess = check(getRes, {
        'get: status is 200': (r) => r.status === 200,
        'get: document matches': (r) => r.json('document.id') === docId,
      });

      apiErrors.add(!getSuccess);
    }
  });

  sleep(0.5);

  // Test: Update Document
  group('Update Document', function () {
    const createRes = http.post(
      `${BASE_URL}/api/writer/documents`,
      JSON.stringify({
        title: `Update Test Doc ${__VU}_${__ITER}`,
        content: 'Original content',
      }),
      { headers }
    );

    if (createRes.status === 201) {
      const docId = createRes.json('document.id');

      const updateRes = http.put(
        `${BASE_URL}/api/writer/documents/${docId}`,
        JSON.stringify({
          content: 'Updated content',
        }),
        { headers }
      );

      const updateSuccess = check(updateRes, {
        'update: status is 200': (r) => r.status === 200,
        'update: content updated': (r) =>
          r.json('document.content') === 'Updated content',
      });

      apiErrors.add(!updateSuccess);
    }
  });

  sleep(0.5);

  // Test: Search Documents
  group('Search Documents', function () {
    const searchRes = http.get(
      `${BASE_URL}/api/writer/documents?search=Test`,
      { headers }
    );

    const searchSuccess = check(searchRes, {
      'search: status is 200': (r) => r.status === 200,
      'search: has results': (r) => r.json('documents.length') >= 0,
    });

    apiErrors.add(!searchSuccess);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'summary-api.json': JSON.stringify(data),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  let summary = '\n========= API STRESS TEST SUMMARY =========\n';

  summary += `\nDuration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;
  summary += `Documents Created: ${data.metrics.documents_created.values.count}\n`;

  summary += `\nResponse Times:\n`;
  summary += `  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  Median: ${data.metrics.http_req_duration.values.med.toFixed(2)}ms\n`;
  summary += `  p95: ${data.metrics.http_req_duration.values.p95.toFixed(2)}ms\n`;
  summary += `  p99: ${data.metrics.http_req_duration.values.p99.toFixed(2)}ms\n`;
  summary += `  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;

  summary += '\n===========================================\n';

  return summary;
}
