import request from 'supertest';

/**
 * API Gateway Integration Tests
 * Tests routing, rate limiting, authentication middleware
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';

describe('API Gateway', () => {
  describe('Routing', () => {
    it('should route /api/auth/* to auth service', async () => {
      const response = await request(GATEWAY_URL)
        .post('/api/auth/register')
        .send({
          name: 'Gateway Test',
          email: `gateway-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(201);
    });

    it('should route /api/writer/* to writer service', async () => {
      const authResponse = await request(GATEWAY_URL)
        .post('/api/auth/register')
        .send({
          name: 'Writer Gateway Test',
          email: `writer-gw-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      const response = await request(GATEWAY_URL)
        .get('/api/writer/documents')
        .set('Authorization', `Bearer ${authResponse.body.token}`);

      expect(response.status).toBe(200);
    });

    it('should route /api/sheets/* to sheets service', async () => {
      const authResponse = await request(GATEWAY_URL)
        .post('/api/auth/register')
        .send({
          name: 'Sheets Gateway Test',
          email: `sheets-gw-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      const response = await request(GATEWAY_URL)
        .get('/api/sheets/spreadsheets')
        .set('Authorization', `Bearer ${authResponse.body.token}`);

      expect(response.status).toBe(200);
    });

    it('should route /api/slides/* to slides service', async () => {
      const authResponse = await request(GATEWAY_URL)
        .post('/api/auth/register')
        .send({
          name: 'Slides Gateway Test',
          email: `slides-gw-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      const response = await request(GATEWAY_URL)
        .get('/api/slides/presentations')
        .set('Authorization', `Bearer ${authResponse.body.token}`);

      expect(response.status).toBe(200);
    });

    it('should route /api/drive/* to drive service', async () => {
      const authResponse = await request(GATEWAY_URL)
        .post('/api/auth/register')
        .send({
          name: 'Drive Gateway Test',
          email: `drive-gw-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      const response = await request(GATEWAY_URL)
        .get('/api/drive/files')
        .set('Authorization', `Bearer ${authResponse.body.token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = [];

      // Make many requests quickly
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(GATEWAY_URL)
            .get('/api/health')
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
      const response = await request(GATEWAY_URL)
        .get('/api/health');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(GATEWAY_URL)
        .get('/api/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should handle preflight requests', async () => {
      const response = await request(GATEWAY_URL)
        .options('/api/writer/documents')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(response.status).toBe(204);
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(GATEWAY_URL)
        .get('/api/unknown/route');

      expect(response.status).toBe(404);
    });

    it('should handle service unavailable', async () => {
      // This would need actual service to be down
      // Mock implementation for demonstration
      const response = await request(GATEWAY_URL)
        .get('/api/unavailable-service/test');

      expect([503, 502]).toContain(response.status);
    });

    it('should return proper error format', async () => {
      const response = await request(GATEWAY_URL)
        .post('/api/auth/login')
        .send({
          email: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await request(GATEWAY_URL)
        .get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should include service statuses', async () => {
      const response = await request(GATEWAY_URL)
        .get('/api/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('auth');
      expect(response.body.services).toHaveProperty('writer');
      expect(response.body.services).toHaveProperty('sheets');
    });
  });

  describe('Request Logging', () => {
    it('should include request ID in response', async () => {
      const response = await request(GATEWAY_URL)
        .get('/api/health');

      expect(response.headers).toHaveProperty('x-request-id');
    });

    it('should accept custom request ID', async () => {
      const customId = 'custom-request-123';

      const response = await request(GATEWAY_URL)
        .get('/api/health')
        .set('X-Request-ID', customId);

      expect(response.headers['x-request-id']).toBe(customId);
    });
  });

  describe('Compression', () => {
    it('should compress responses when requested', async () => {
      const response = await request(GATEWAY_URL)
        .get('/api/health')
        .set('Accept-Encoding', 'gzip');

      expect(response.headers['content-encoding']).toBe('gzip');
    });
  });
});
