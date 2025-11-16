import { test, expect } from '@playwright/test';

/**
 * Authentication E2E tests
 * Tests user registration, login, logout, and password reset flows
 */

test.describe('Authentication', () => {
  test.describe('User Registration', () => {
    test('should register a new user successfully @smoke', async ({ page }) => {
      await page.goto('/auth/register');

      // Fill registration form
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/hub/);

      // Should show welcome message
      await expect(page.locator('text=Welcome')).toBeVisible();
    });

    test('should show validation errors for invalid data', async ({ page }) => {
      await page.goto('/auth/register');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=Name is required')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/auth/register');

      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Invalid email format')).toBeVisible();
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/auth/register');

      await page.fill('input[name="password"]', 'weak');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });

    test('should validate password confirmation match', async ({ page }) => {
      await page.goto('/auth/register');

      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Passwords do not match')).toBeVisible();
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      const email = 'existing@example.com';

      await page.goto('/auth/register');
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Email already exists')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should login successfully with valid credentials @smoke', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/hub/);

      // Should show user menu
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('should show error for non-existent user', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('should support "Remember Me" functionality', async ({ page, context }) => {
      await page.goto('/auth/login');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.check('input[name="rememberMe"]');
      await page.click('button[type="submit"]');

      // Check if cookie is set with long expiration
      const cookies = await context.cookies();
      const authCookie = cookies.find(c => c.name === 'auth-token');

      expect(authCookie).toBeDefined();
      expect(authCookie!.expires).toBeGreaterThan(Date.now() / 1000 + 86400); // > 1 day
    });

    test('should redirect to original page after login', async ({ page }) => {
      // Try to access protected page
      await page.goto('/hub/documents');

      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/);

      // Login
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Should redirect back to original page
      await expect(page).toHaveURL(/\/hub\/documents/);
    });
  });

  test.describe('User Logout', () => {
    test('should logout successfully @smoke', async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Logout');

      // Should redirect to login page
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should clear session data on logout', async ({ page, context }) => {
      // Login
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Logout');

      // Check if auth cookie is cleared
      const cookies = await context.cookies();
      const authCookie = cookies.find(c => c.name === 'auth-token');

      expect(authCookie).toBeUndefined();
    });
  });

  test.describe('Password Reset', () => {
    test('should request password reset successfully', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Password reset email sent')).toBeVisible();
    });

    test('should reset password with valid token', async ({ page }) => {
      const resetToken = 'valid-reset-token-123';

      await page.goto(`/auth/reset-password?token=${resetToken}`);

      await page.fill('input[name="password"]', 'NewPassword123!');
      await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Password reset successful')).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should reject invalid reset token', async ({ page }) => {
      await page.goto('/auth/reset-password?token=invalid-token');

      await page.fill('input[name="password"]', 'NewPassword123!');
      await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
      await page.click('button[type="submit"]');

      await expect(page.locator('text=Invalid or expired reset token')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      // Login
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Reload page
      await page.reload();

      // Should still be logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should handle expired sessions', async ({ page, context }) => {
      // Login
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Manually expire the session cookie
      await context.clearCookies();

      // Try to access protected page
      await page.goto('/hub/documents');

      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should handle concurrent sessions', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login in both contexts
      for (const page of [page1, page2]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Both sessions should be active
      await expect(page1.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page2.locator('[data-testid="user-menu"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('OAuth Integration', () => {
    test('should login with Google OAuth', async ({ page }) => {
      await page.goto('/auth/login');

      // Click Google login button
      await page.click('[data-testid="google-login"]');

      // Mock OAuth flow (in real tests, you'd intercept the OAuth flow)
      await expect(page).toHaveURL(/accounts\.google\.com/);
    });

    test('should login with Microsoft OAuth', async ({ page }) => {
      await page.goto('/auth/login');

      await page.click('[data-testid="microsoft-login"]');

      await expect(page).toHaveURL(/login\.microsoftonline\.com/);
    });
  });
});
