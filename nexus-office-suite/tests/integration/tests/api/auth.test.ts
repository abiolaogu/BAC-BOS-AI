import request from 'supertest';
import jwt from 'jsonwebtoken';

/**
 * Authentication API Integration Tests
 * Tests user registration, login, token management
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Authentication API', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should validate required fields', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          email: 'invalid@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toContain('Name is required');
      expect(response.body.errors).toContain('Password is required');
    });

    it('should validate email format', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Invalid email format');
    });

    it('should validate password strength', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject duplicate email registration', async () => {
      const email = 'duplicate@example.com';

      // First registration
      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email,
          password: 'SecurePassword123!',
        });

      // Second registration with same email
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Test User 2',
          email,
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Login Test User',
          email: 'logintest@example.com',
          password: 'SecurePassword123!',
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('logintest@example.com');
    });

    it('should reject invalid email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return valid JWT token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'SecurePassword123!',
        });

      const { token } = response.body;
      const decoded = jwt.verify(token, JWT_SECRET);

      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email');
      expect(decoded.email).toBe('logintest@example.com');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Logout Test User',
          email: `logout-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      authToken = response.body.token;
    });

    it('should logout successfully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should reject logout without token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Reset Test User',
          email: 'reset@example.com',
          password: 'SecurePassword123!',
        });
    });

    it('should send password reset email', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send({
          email: 'reset@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      // Should return 200 to prevent email enumeration
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      // In real test, you'd get token from email or test database
      const resetToken = 'valid-reset-token-123';

      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset successful');
    });

    it('should reject invalid reset token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewSecurePassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid or expired reset token');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Me Test User',
          email: `me-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      authToken = response.body.token;
    });

    it('should get current user with valid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Refresh Test User',
          email: `refresh-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      refreshToken = response.body.refreshToken;
    });

    it('should refresh access token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({
          refreshToken,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid refresh token');
    });
  });
});
