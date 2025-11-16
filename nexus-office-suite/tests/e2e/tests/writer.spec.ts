import { test, expect } from '@playwright/test';

/**
 * NEXUS Writer E2E tests
 * Tests document creation, editing, formatting, and collaboration
 */

test.describe('NEXUS Writer', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/hub/);
  });

  test.describe('Document Creation', () => {
    test('should create a new blank document @smoke', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      // Should open Writer with blank document
      await expect(page).toHaveURL(/\/writer\//);
      await expect(page.locator('[data-testid="editor"]')).toBeVisible();
      await expect(page.locator('[data-testid="document-title"]')).toHaveValue('Untitled Document');
    });

    test('should create document from template', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="templates"]');
      await page.click('[data-testid="template-resume"]');

      // Should open Writer with template content
      await expect(page).toHaveURL(/\/writer\//);
      await expect(page.locator('[data-testid="editor"]')).toContainText('Resume');
    });

    test('should auto-save document', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      // Type in editor
      await page.locator('[data-testid="editor"]').click();
      await page.keyboard.type('This is a test document');

      // Wait for auto-save
      await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved');
    });
  });

  test.describe('Text Editing', () => {
    test('should type and edit text', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      // Type text
      await page.keyboard.type('Hello World');
      await expect(editor).toContainText('Hello World');

      // Select all and delete
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      await expect(editor).toBeEmpty();
    });

    test('should support undo and redo', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      // Type text
      await page.keyboard.type('First line');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Second line');

      // Undo
      await page.keyboard.press('Control+Z');
      await expect(editor).not.toContainText('Second line');

      // Redo
      await page.keyboard.press('Control+Y');
      await expect(editor).toContainText('Second line');
    });

    test('should support copy, cut, and paste', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      // Type and select text
      await page.keyboard.type('Copy this text');
      await page.keyboard.press('Control+A');

      // Copy
      await page.keyboard.press('Control+C');

      // Move cursor and paste
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Control+V');

      await expect(editor).toContainText('Copy this text');
    });
  });

  test.describe('Text Formatting', () => {
    test('should apply bold formatting', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      await page.keyboard.type('Bold text');
      await page.keyboard.press('Control+A');
      await page.click('[data-testid="bold-button"]');

      await expect(editor.locator('strong')).toContainText('Bold text');
    });

    test('should apply italic formatting', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      await page.keyboard.type('Italic text');
      await page.keyboard.press('Control+A');
      await page.click('[data-testid="italic-button"]');

      await expect(editor.locator('em')).toContainText('Italic text');
    });

    test('should apply underline formatting', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      await page.keyboard.type('Underline text');
      await page.keyboard.press('Control+A');
      await page.click('[data-testid="underline-button"]');

      await expect(editor.locator('u')).toContainText('Underline text');
    });

    test('should change font size', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      await page.keyboard.type('Font size test');
      await page.keyboard.press('Control+A');
      await page.click('[data-testid="font-size-dropdown"]');
      await page.click('text=18');

      await expect(editor).toContainText('Font size test');
    });

    test('should change text color', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      await page.keyboard.type('Colored text');
      await page.keyboard.press('Control+A');
      await page.click('[data-testid="text-color-button"]');
      await page.click('[data-testid="color-red"]');

      await expect(editor.locator('[style*="color"]')).toContainText('Colored text');
    });
  });

  test.describe('Lists and Alignment', () => {
    test('should create bulleted list', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      await page.click('[data-testid="bullet-list-button"]');
      await page.keyboard.type('Item 1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Item 2');

      await expect(editor.locator('ul li')).toHaveCount(2);
    });

    test('should create numbered list', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      await page.click('[data-testid="numbered-list-button"]');
      await page.keyboard.type('Step 1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Step 2');

      await expect(editor.locator('ol li')).toHaveCount(2);
    });

    test('should align text left, center, right', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      await page.keyboard.type('Alignment test');
      await page.keyboard.press('Control+A');

      // Center align
      await page.click('[data-testid="align-center-button"]');
      await expect(editor.locator('[style*="text-align: center"]')).toBeVisible();

      // Right align
      await page.click('[data-testid="align-right-button"]');
      await expect(editor.locator('[style*="text-align: right"]')).toBeVisible();
    });
  });

  test.describe('Images and Media', () => {
    test('should insert image from URL', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      await page.click('[data-testid="insert-image-button"]');
      await page.fill('input[name="imageUrl"]', 'https://example.com/image.jpg');
      await page.click('button:has-text("Insert")');

      await expect(page.locator('[data-testid="editor"] img')).toBeVisible();
    });

    test('should upload and insert image', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      await page.click('[data-testid="insert-image-button"]');

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      });

      await expect(page.locator('[data-testid="editor"] img')).toBeVisible();
    });

    test('should insert table', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      await page.click('[data-testid="insert-table-button"]');
      await page.fill('input[name="rows"]', '3');
      await page.fill('input[name="columns"]', '3');
      await page.click('button:has-text("Insert")');

      await expect(page.locator('[data-testid="editor"] table')).toBeVisible();
      await expect(page.locator('[data-testid="editor"] table tr')).toHaveCount(3);
    });
  });

  test.describe('Document Management', () => {
    test('should rename document', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const titleInput = page.locator('[data-testid="document-title"]');
      await titleInput.click();
      await titleInput.fill('My Test Document');
      await titleInput.press('Enter');

      await expect(titleInput).toHaveValue('My Test Document');
      await expect(page.locator('[data-testid="save-status"]')).toContainText('Saved');
    });

    test('should download document as PDF', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="file-menu"]');
      await page.click('text=Download as PDF');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should download document as DOCX', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="file-menu"]');
      await page.click('text=Download as DOCX');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.docx');
    });

    test('should share document', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      await page.click('[data-testid="share-button"]');
      await page.fill('input[name="email"]', 'colleague@example.com');
      await page.click('button:has-text("Share")');

      await expect(page.locator('text=Document shared')).toBeVisible();
    });

    test('should delete document', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      await page.click('[data-testid="file-menu"]');
      await page.click('text=Delete');
      await page.click('button:has-text("Confirm")');

      // Should redirect to hub
      await expect(page).toHaveURL(/\/hub/);
    });
  });

  test.describe('Collaboration', () => {
    test('should show collaborators', async ({ page }) => {
      // Open shared document
      await page.goto('/writer/shared-doc-123');

      // Should show collaborators list
      await expect(page.locator('[data-testid="collaborators"]')).toBeVisible();
    });

    test('should see real-time cursor positions', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const page of [page1, page2]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same document
      const docUrl = '/writer/shared-doc-123';
      await page1.goto(docUrl);
      await page2.goto(docUrl);

      // Type in page1
      await page1.locator('[data-testid="editor"]').click();
      await page1.keyboard.type('User 1 typing');

      // Page2 should see cursor
      await expect(page2.locator('[data-testid="remote-cursor"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should support common keyboard shortcuts', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-document"]');

      const editor = page.locator('[data-testid="editor"]');
      await editor.click();

      // Bold with Ctrl+B
      await page.keyboard.type('Bold');
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Control+B');
      await expect(editor.locator('strong')).toBeVisible();

      // Italic with Ctrl+I
      await page.keyboard.press('ArrowRight');
      await page.keyboard.type(' Italic');
      await page.keyboard.press('Shift+Control+ArrowLeft');
      await page.keyboard.press('Control+I');
      await expect(editor.locator('em')).toBeVisible();
    });
  });
});
