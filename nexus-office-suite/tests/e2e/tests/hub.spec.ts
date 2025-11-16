import { test, expect } from '@playwright/test';

/**
 * NEXUS Hub E2E tests
 * Tests dashboard, navigation, and cross-app integration
 */

test.describe('NEXUS Hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/hub/);
  });

  test.describe('Dashboard', () => {
    test('should display dashboard @smoke', async ({ page }) => {
      await page.goto('/hub');

      await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="quick-access"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-files"]')).toBeVisible();
    });

    test('should show recent documents', async ({ page }) => {
      await page.goto('/hub');

      await expect(page.locator('[data-testid="recent-files"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent-file"]')).toHaveCount(5);
    });

    test('should show quick actions', async ({ page }) => {
      await page.goto('/hub');

      await expect(page.locator('[data-testid="create-document"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-spreadsheet"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-presentation"]')).toBeVisible();
      await expect(page.locator('[data-testid="new-meeting"]')).toBeVisible();
    });

    test('should display storage widget', async ({ page }) => {
      await page.goto('/hub');

      await expect(page.locator('[data-testid="storage-widget"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-used"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-total"]')).toBeVisible();
    });

    test('should show activity feed', async ({ page }) => {
      await page.goto('/hub');

      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-item"]')).toHaveCount.greaterThan(0);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to Writer from dashboard', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="create-document"]');

      await expect(page).toHaveURL(/\/writer\//);
    });

    test('should navigate to Sheets from dashboard', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="create-spreadsheet"]');

      await expect(page).toHaveURL(/\/sheets\//);
    });

    test('should navigate to Slides from dashboard', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="create-presentation"]');

      await expect(page).toHaveURL(/\/slides\//);
    });

    test('should navigate to Drive from sidebar', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="sidebar-drive"]');

      await expect(page).toHaveURL(/\/drive/);
    });

    test('should navigate to Meet from sidebar', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="sidebar-meet"]');

      await expect(page).toHaveURL(/\/meet/);
    });

    test('should navigate back to Hub from apps', async ({ page }) => {
      await page.goto('/writer/doc-123');

      await page.click('[data-testid="hub-link"]');

      await expect(page).toHaveURL(/\/hub/);
    });
  });

  test.describe('Search', () => {
    test('should search across all apps', async ({ page }) => {
      await page.goto('/hub');

      await page.fill('[data-testid="global-search"]', 'project');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-result"]')).toHaveCount.greaterThan(0);
    });

    test('should filter search by app', async ({ page }) => {
      await page.goto('/hub');

      await page.fill('[data-testid="global-search"]', 'meeting');
      await page.keyboard.press('Enter');

      await page.click('[data-testid="filter-meet"]');

      await expect(page.locator('[data-testid="search-result"][data-app="meet"]')).toBeVisible();
    });

    test('should show search suggestions', async ({ page }) => {
      await page.goto('/hub');

      await page.fill('[data-testid="global-search"]', 'doc');

      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="suggestion"]')).toHaveCount.greaterThan(0);
    });

    test('should open file from search results', async ({ page }) => {
      await page.goto('/hub');

      await page.fill('[data-testid="global-search"]', 'report');
      await page.keyboard.press('Enter');

      await page.click('[data-testid="search-result"]:has-text("Annual Report")');

      await expect(page).toHaveURL(/\/(writer|sheets|slides)\//);
    });
  });

  test.describe('Templates', () => {
    test('should show template gallery', async ({ page }) => {
      await page.goto('/hub/templates');

      await expect(page.locator('[data-testid="template-gallery"]')).toBeVisible();
      await expect(page.locator('[data-testid="template-category"]')).toHaveCount.greaterThan(0);
    });

    test('should filter templates by category', async ({ page }) => {
      await page.goto('/hub/templates');

      await page.click('[data-testid="category-business"]');

      await expect(page.locator('[data-testid="template"][data-category="business"]')).toBeVisible();
    });

    test('should create document from template', async ({ page }) => {
      await page.goto('/hub/templates');

      await page.click('[data-testid="template-resume"]');

      await expect(page).toHaveURL(/\/writer\//);
      await expect(page.locator('[data-testid="editor"]')).toContainText('Resume');
    });

    test('should preview template', async ({ page }) => {
      await page.goto('/hub/templates');

      await page.click('[data-testid="template-invoice"]');
      await page.click('[data-testid="preview-button"]');

      await expect(page.locator('[data-testid="template-preview"]')).toBeVisible();
    });
  });

  test.describe('User Profile', () => {
    test('should open user menu', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="user-menu"]');

      await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
      await expect(page.locator('text=Profile')).toBeVisible();
      await expect(page.locator('text=Settings')).toBeVisible();
      await expect(page.locator('text=Logout')).toBeVisible();
    });

    test('should navigate to profile settings', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="user-menu"]');
      await page.click('text=Profile');

      await expect(page).toHaveURL(/\/settings\/profile/);
    });

    test('should update profile information', async ({ page }) => {
      await page.goto('/settings/profile');

      await page.fill('input[name="displayName"]', 'John Doe Updated');
      await page.fill('textarea[name="bio"]', 'Updated bio');
      await page.click('button:has-text("Save")');

      await expect(page.locator('text=Profile updated')).toBeVisible();
    });

    test('should change avatar', async ({ page }) => {
      await page.goto('/settings/profile');

      await page.click('[data-testid="change-avatar"]');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'avatar.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      await expect(page.locator('text=Avatar updated')).toBeVisible();
    });
  });

  test.describe('Settings', () => {
    test('should access general settings', async ({ page }) => {
      await page.goto('/settings');

      await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="general-settings"]')).toBeVisible();
    });

    test('should change language', async ({ page }) => {
      await page.goto('/settings');

      await page.selectOption('select[name="language"]', 'es');
      await page.click('button:has-text("Save")');

      await expect(page.locator('text=Configuración')).toBeVisible();
    });

    test('should change theme', async ({ page }) => {
      await page.goto('/settings');

      await page.click('[data-testid="theme-dark"]');

      await expect(page.locator('html')).toHaveClass(/dark-theme/);
    });

    test('should configure notifications', async ({ page }) => {
      await page.goto('/settings/notifications');

      await page.check('input[name="emailNotifications"]');
      await page.check('input[name="desktopNotifications"]');
      await page.click('button:has-text("Save")');

      await expect(page.locator('text=Notification settings updated')).toBeVisible();
    });

    test('should manage connected accounts', async ({ page }) => {
      await page.goto('/settings/accounts');

      await expect(page.locator('[data-testid="connected-accounts"]')).toBeVisible();
      await expect(page.locator('[data-testid="connect-google"]')).toBeVisible();
      await expect(page.locator('[data-testid="connect-microsoft"]')).toBeVisible();
    });
  });

  test.describe('Notifications', () => {
    test('should show notification center', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="notifications-button"]');

      await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();
    });

    test('should show unread notification badge', async ({ page }) => {
      await page.goto('/hub');

      await expect(page.locator('[data-testid="notifications-badge"]')).toBeVisible();
      await expect(page.locator('[data-testid="notifications-badge"]')).toHaveText(/[1-9]/);
    });

    test('should mark notification as read', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="notifications-button"]');
      await page.click('[data-testid="notification-1"]');

      await expect(page.locator('[data-testid="notification-1"]')).not.toHaveClass(/unread/);
    });

    test('should mark all notifications as read', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="notifications-button"]');
      await page.click('[data-testid="mark-all-read"]');

      await expect(page.locator('[data-testid="notification"][class*="unread"]')).toHaveCount(0);
    });

    test('should clear all notifications', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="notifications-button"]');
      await page.click('[data-testid="clear-all"]');

      await expect(page.locator('[data-testid="empty-notifications"]')).toBeVisible();
    });
  });

  test.describe('File Browser', () => {
    test('should show file browser in sidebar', async ({ page }) => {
      await page.goto('/hub');

      await expect(page.locator('[data-testid="file-browser"]')).toBeVisible();
      await expect(page.locator('[data-testid="my-files"]')).toBeVisible();
      await expect(page.locator('[data-testid="shared-with-me"]')).toBeVisible();
      await expect(page.locator('[data-testid="recent"]')).toBeVisible();
    });

    test('should expand folder in sidebar', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="folder-documents"]');

      await expect(page.locator('[data-testid="folder-documents"]')).toHaveClass(/expanded/);
      await expect(page.locator('[data-testid="folder-documents"] [data-testid="subfolder"]')).toBeVisible();
    });

    test('should open file from sidebar', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="folder-documents"]');
      await page.click('[data-file="report.docx"]');

      await expect(page).toHaveURL(/\/writer\//);
    });
  });

  test.describe('Collaboration', () => {
    test('should show shared files', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="shared-with-me"]');

      await expect(page.locator('[data-testid="shared-file"]')).toHaveCount.greaterThan(0);
    });

    test('should accept share invitation', async ({ page }) => {
      await page.goto('/hub/notifications');

      await page.click('[data-notification-type="share-invite"]');
      await page.click('button:has-text("Accept")');

      await expect(page.locator('text=File added to your drive')).toBeVisible();
    });

    test('should show active collaborators', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="recent-file-1"]');

      await expect(page.locator('[data-testid="active-collaborators"]')).toBeVisible();
      await expect(page.locator('[data-testid="collaborator-avatar"]')).toHaveCount.greaterThan(0);
    });
  });

  test.describe('Shortcuts', () => {
    test('should show keyboard shortcuts help', async ({ page }) => {
      await page.goto('/hub');

      await page.keyboard.press('?');

      await expect(page.locator('[data-testid="shortcuts-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="shortcut-list"]')).toBeVisible();
    });

    test('should use keyboard shortcut for search', async ({ page }) => {
      await page.goto('/hub');

      await page.keyboard.press('Control+K');

      await expect(page.locator('[data-testid="global-search"]')).toBeFocused();
    });

    test('should use keyboard shortcut to create document', async ({ page }) => {
      await page.goto('/hub');

      await page.keyboard.press('Control+N');
      await page.keyboard.press('d');

      await expect(page).toHaveURL(/\/writer\//);
    });
  });

  test.describe('Offline Mode', () => {
    test('should show offline indicator when offline', async ({ page, context }) => {
      await page.goto('/hub');

      await context.setOffline(true);

      await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    });

    test('should sync when back online', async ({ page, context }) => {
      await page.goto('/hub');

      await context.setOffline(true);
      await page.click('[data-testid="create-document"]');

      // Make changes while offline
      await page.locator('[data-testid="editor"]').click();
      await page.keyboard.type('Offline content');

      await context.setOffline(false);

      await expect(page.locator('[data-testid="sync-complete"]')).toBeVisible();
    });
  });

  test.describe('Help and Support', () => {
    test('should open help center', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="help-button"]');

      await expect(page.locator('[data-testid="help-panel"]')).toBeVisible();
      await expect(page.locator('text=Help Center')).toBeVisible();
    });

    test('should search help articles', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="help-button"]');
      await page.fill('[data-testid="help-search"]', 'sharing');

      await expect(page.locator('[data-testid="help-article"]')).toHaveCount.greaterThan(0);
    });

    test('should open feedback form', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="help-button"]');
      await page.click('text=Send feedback');

      await expect(page.locator('[data-testid="feedback-form"]')).toBeVisible();
    });

    test('should submit feedback', async ({ page }) => {
      await page.goto('/hub');

      await page.click('[data-testid="help-button"]');
      await page.click('text=Send feedback');
      await page.fill('textarea[name="feedback"]', 'Great product!');
      await page.selectOption('select[name="category"]', 'feature-request');
      await page.click('button:has-text("Submit")');

      await expect(page.locator('text=Thank you for your feedback')).toBeVisible();
    });
  });
});
