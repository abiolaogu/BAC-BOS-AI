import { test, expect } from '@playwright/test';

/**
 * NEXUS Drive E2E tests
 * Tests file upload, download, folder management, and sharing
 */

test.describe('NEXUS Drive', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/hub/);
  });

  test.describe('File Upload', () => {
    test('should upload a file @smoke', async ({ page }) => {
      await page.goto('/drive');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('fake-pdf-content'),
      });

      await expect(page.locator('text=test-document.pdf')).toBeVisible();
    });

    test('should upload multiple files', async ({ page }) => {
      await page.goto('/drive');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        {
          name: 'file1.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('content1'),
        },
        {
          name: 'file2.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('content2'),
        },
      ]);

      await expect(page.locator('text=file1.txt')).toBeVisible();
      await expect(page.locator('text=file2.txt')).toBeVisible();
    });

    test('should show upload progress', async ({ page }) => {
      await page.goto('/drive');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'large-file.zip',
        mimeType: 'application/zip',
        buffer: Buffer.alloc(1024 * 1024), // 1MB
      });

      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
    });

    test('should reject files exceeding size limit', async ({ page }) => {
      await page.goto('/drive');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'huge-file.bin',
        mimeType: 'application/octet-stream',
        buffer: Buffer.alloc(1024 * 1024 * 1024), // 1GB
      });

      await expect(page.locator('text=File too large')).toBeVisible();
    });

    test('should support drag and drop upload', async ({ page }) => {
      await page.goto('/drive');

      const dropZone = page.locator('[data-testid="drop-zone"]');

      await dropZone.dispatchEvent('drop', {
        dataTransfer: {
          files: [
            new File(['content'], 'dragged-file.txt', { type: 'text/plain' }),
          ],
        },
      });

      await expect(page.locator('text=dragged-file.txt')).toBeVisible();
    });
  });

  test.describe('File Download', () => {
    test('should download a file', async ({ page }) => {
      await page.goto('/drive');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-file="test-file.txt"]', { button: 'right' });
      await page.click('text=Download');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe('test-file.txt');
    });

    test('should download multiple files as ZIP', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="file1.txt"]');
      await page.keyboard.down('Control');
      await page.click('[data-file="file2.txt"]');
      await page.keyboard.up('Control');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-button"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.zip');
    });
  });

  test.describe('Folder Management', () => {
    test('should create new folder', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-testid="new-folder-button"]');
      await page.fill('input[name="folderName"]', 'My Folder');
      await page.click('button:has-text("Create")');

      await expect(page.locator('text=My Folder')).toBeVisible();
      await expect(page.locator('[data-folder="My Folder"]')).toHaveAttribute('data-type', 'folder');
    });

    test('should rename folder', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-folder="My Folder"]', { button: 'right' });
      await page.click('text=Rename');
      await page.fill('input[name="folderName"]', 'Renamed Folder');
      await page.click('button:has-text("Rename")');

      await expect(page.locator('text=Renamed Folder')).toBeVisible();
    });

    test('should delete folder', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-folder="My Folder"]', { button: 'right' });
      await page.click('text=Delete');
      await page.click('button:has-text("Confirm")');

      await expect(page.locator('text=My Folder')).not.toBeVisible();
    });

    test('should navigate into folder', async ({ page }) => {
      await page.goto('/drive');

      await page.dblclick('[data-folder="My Folder"]');

      await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('My Folder');
      await expect(page).toHaveURL(/\/drive\/My%20Folder/);
    });

    test('should navigate with breadcrumbs', async ({ page }) => {
      await page.goto('/drive');

      await page.dblclick('[data-folder="Documents"]');
      await page.dblclick('[data-folder="Projects"]');

      await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('Documents');
      await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('Projects');

      await page.click('[data-testid="breadcrumb"] >> text=Documents');

      await expect(page).toHaveURL(/\/drive\/Documents$/);
    });
  });

  test.describe('File Operations', () => {
    test('should rename file', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Rename');
      await page.fill('input[name="fileName"]', 'renamed-test.txt');
      await page.click('button:has-text("Rename")');

      await expect(page.locator('text=renamed-test.txt')).toBeVisible();
    });

    test('should delete file', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Delete');
      await page.click('button:has-text("Confirm")');

      await expect(page.locator('text=test.txt')).not.toBeVisible();
    });

    test('should move file to folder', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]');
      await page.click('[data-testid="move-button"]');
      await page.click('[data-folder="Documents"]');
      await page.click('button:has-text("Move here")');

      await expect(page.locator('text=test.txt')).not.toBeVisible();

      await page.dblclick('[data-folder="Documents"]');
      await expect(page.locator('text=test.txt')).toBeVisible();
    });

    test('should copy file', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Make a copy');

      await expect(page.locator('text=test (copy).txt')).toBeVisible();
    });

    test('should star/favorite file', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Add to starred');

      await expect(page.locator('[data-file="test.txt"] [data-testid="star-icon"]')).toBeVisible();

      // Navigate to starred view
      await page.click('[data-testid="starred-view"]');
      await expect(page.locator('text=test.txt')).toBeVisible();
    });
  });

  test.describe('File Sharing', () => {
    test('should share file with specific user', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Share');
      await page.fill('input[name="email"]', 'colleague@example.com');
      await page.selectOption('select[name="permission"]', 'view');
      await page.click('button:has-text("Share")');

      await expect(page.locator('text=File shared')).toBeVisible();
    });

    test('should create shareable link', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Get link');
      await page.click('button:has-text("Create link")');

      await expect(page.locator('input[name="shareLink"]')).toHaveValue(/https:\/\/.+/);
    });

    test('should set link expiration', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Get link');
      await page.click('button:has-text("Create link")');
      await page.click('[data-testid="link-settings"]');
      await page.selectOption('select[name="expiration"]', '7-days');
      await page.click('button:has-text("Save")');

      await expect(page.locator('text=Link expires in 7 days')).toBeVisible();
    });

    test('should revoke shared access', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Share');
      await page.click('[data-user="colleague@example.com"] [data-testid="remove-access"]');

      await expect(page.locator('[data-user="colleague@example.com"]')).not.toBeVisible();
    });
  });

  test.describe('Search and Filter', () => {
    test('should search for files', async ({ page }) => {
      await page.goto('/drive');

      await page.fill('[data-testid="search-input"]', 'test');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-file*="test"]')).toBeVisible();
    });

    test('should filter by file type', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-testid="filter-menu"]');
      await page.click('[data-testid="filter-documents"]');

      await expect(page.locator('[data-file-type="document"]')).toBeVisible();
    });

    test('should sort files by name', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-testid="sort-menu"]');
      await page.click('text=Name (A-Z)');

      const files = await page.locator('[data-file]').allTextContents();
      expect(files).toEqual([...files].sort());
    });

    test('should sort files by date', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-testid="sort-menu"]');
      await page.click('text=Last modified');

      await expect(page.locator('[data-file]').first()).toBeVisible();
    });
  });

  test.describe('View Options', () => {
    test('should switch between list and grid view', async ({ page }) => {
      await page.goto('/drive');

      // Switch to grid view
      await page.click('[data-testid="grid-view-button"]');
      await expect(page.locator('[data-testid="file-grid"]')).toBeVisible();

      // Switch to list view
      await page.click('[data-testid="list-view-button"]');
      await expect(page.locator('[data-testid="file-list"]')).toBeVisible();
    });

    test('should show file details panel', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]');
      await page.click('[data-testid="info-button"]');

      await expect(page.locator('[data-testid="details-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-size"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-type"]')).toBeVisible();
      await expect(page.locator('[data-testid="modified-date"]')).toBeVisible();
    });
  });

  test.describe('Storage Management', () => {
    test('should show storage usage', async ({ page }) => {
      await page.goto('/drive');

      await expect(page.locator('[data-testid="storage-usage"]')).toBeVisible();
      await expect(page.locator('[data-testid="storage-bar"]')).toBeVisible();
    });

    test('should view storage details', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-testid="storage-usage"]');

      await expect(page.locator('[data-testid="storage-breakdown"]')).toBeVisible();
      await expect(page.locator('text=Documents')).toBeVisible();
      await expect(page.locator('text=Images')).toBeVisible();
      await expect(page.locator('text=Videos')).toBeVisible();
    });
  });

  test.describe('Trash', () => {
    test('should move file to trash', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Move to trash');

      await expect(page.locator('text=test.txt')).not.toBeVisible();

      await page.click('[data-testid="trash-view"]');
      await expect(page.locator('text=test.txt')).toBeVisible();
    });

    test('should restore file from trash', async ({ page }) => {
      await page.goto('/drive/trash');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Restore');

      await expect(page.locator('text=test.txt')).not.toBeVisible();

      await page.click('[data-testid="my-drive-view"]');
      await expect(page.locator('text=test.txt')).toBeVisible();
    });

    test('should permanently delete file from trash', async ({ page }) => {
      await page.goto('/drive/trash');

      await page.click('[data-file="test.txt"]', { button: 'right' });
      await page.click('text=Delete forever');
      await page.click('button:has-text("Confirm")');

      await expect(page.locator('text=test.txt')).not.toBeVisible();
    });

    test('should empty trash', async ({ page }) => {
      await page.goto('/drive/trash');

      await page.click('[data-testid="empty-trash-button"]');
      await page.click('button:has-text("Confirm")');

      await expect(page.locator('[data-testid="empty-trash-message"]')).toBeVisible();
    });
  });

  test.describe('Recent Files', () => {
    test('should show recent files', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-testid="recent-view"]');

      await expect(page.locator('[data-testid="recent-files"]')).toBeVisible();
    });

    test('should open recent file', async ({ page }) => {
      await page.goto('/drive/recent');

      await page.click('[data-file="recent-doc.docx"]');

      await expect(page).toHaveURL(/\/writer\//);
    });
  });

  test.describe('Shared With Me', () => {
    test('should show shared files', async ({ page }) => {
      await page.goto('/drive');

      await page.click('[data-testid="shared-view"]');

      await expect(page.locator('[data-testid="shared-files"]')).toBeVisible();
    });

    test('should open shared file', async ({ page }) => {
      await page.goto('/drive/shared');

      await page.click('[data-file="shared-spreadsheet.xlsx"]');

      await expect(page).toHaveURL(/\/sheets\//);
    });
  });
});
