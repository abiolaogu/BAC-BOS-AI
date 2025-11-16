import { test, expect } from '@playwright/test';

/**
 * Real-time Collaboration E2E tests
 * Tests simultaneous editing, presence, comments, and real-time features
 */

test.describe('Real-time Collaboration', () => {
  test.describe('Simultaneous Editing - Writer', () => {
    test('should show real-time edits from multiple users @smoke', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login user 1
      await page1.goto('/auth/login');
      await page1.fill('input[name="email"]', 'user1@example.com');
      await page1.fill('input[name="password"]', 'password123');
      await page1.click('button[type="submit"]');

      // Login user 2
      await page2.goto('/auth/login');
      await page2.fill('input[name="email"]', 'user2@example.com');
      await page2.fill('input[name="password"]', 'password123');
      await page2.click('button[type="submit"]');

      // Open same document
      const docUrl = '/writer/shared-doc-123';
      await page1.goto(docUrl);
      await page2.goto(docUrl);

      // User 1 types
      await page1.locator('[data-testid="editor"]').click();
      await page1.keyboard.type('User 1 typing');

      // User 2 should see it
      await expect(page2.locator('[data-testid="editor"]')).toContainText('User 1 typing');

      // User 2 types
      await page2.locator('[data-testid="editor"]').click();
      await page2.keyboard.press('End');
      await page2.keyboard.press('Enter');
      await page2.keyboard.type('User 2 typing');

      // User 1 should see it
      await expect(page1.locator('[data-testid="editor"]')).toContainText('User 2 typing');

      await context1.close();
      await context2.close();
    });

    test('should show user cursors', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same document
      await page1.goto('/writer/shared-doc-123');
      await page2.goto('/writer/shared-doc-123');

      // Move cursor in page1
      await page1.locator('[data-testid="editor"]').click();

      // page2 should see user1's cursor
      await expect(page2.locator('[data-testid="remote-cursor"][data-user="user1@example.com"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should show user selections', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same document
      await page1.goto('/writer/shared-doc-123');
      await page2.goto('/writer/shared-doc-123');

      // Select text in page1
      await page1.locator('[data-testid="editor"]').click();
      await page1.keyboard.type('Select this text');
      await page1.keyboard.press('Control+A');

      // page2 should see user1's selection
      await expect(page2.locator('[data-testid="remote-selection"][data-user="user1@example.com"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should handle conflict resolution', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same document
      await page1.goto('/writer/shared-doc-123');
      await page2.goto('/writer/shared-doc-123');

      // Both users type at same location simultaneously
      const editor1 = page1.locator('[data-testid="editor"]');
      const editor2 = page2.locator('[data-testid="editor"]');

      await editor1.click();
      await editor2.click();

      await Promise.all([
        page1.keyboard.type('User 1 text'),
        page2.keyboard.type('User 2 text'),
      ]);

      // Both texts should be present (merged)
      await expect(editor1).toContainText('User 1 text');
      await expect(editor1).toContainText('User 2 text');
      await expect(editor2).toContainText('User 1 text');
      await expect(editor2).toContainText('User 2 text');

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Simultaneous Editing - Sheets', () => {
    test('should show real-time cell updates', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same spreadsheet
      await page1.goto('/sheets/shared-sheet-123');
      await page2.goto('/sheets/shared-sheet-123');

      // User 1 edits cell
      await page1.click('[data-cell="A1"]');
      await page1.keyboard.type('100');
      await page1.keyboard.press('Enter');

      // User 2 should see it
      await expect(page2.locator('[data-cell="A1"]')).toContainText('100');

      await context1.close();
      await context2.close();
    });

    test('should show active cell selections', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same spreadsheet
      await page1.goto('/sheets/shared-sheet-123');
      await page2.goto('/sheets/shared-sheet-123');

      // User 1 selects cell
      await page1.click('[data-cell="B2"]');

      // User 2 should see user1's selection
      await expect(page2.locator('[data-cell="B2"][data-selected-by="user1@example.com"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should prevent simultaneous cell editing', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same spreadsheet
      await page1.goto('/sheets/shared-sheet-123');
      await page2.goto('/sheets/shared-sheet-123');

      // User 1 starts editing cell
      await page1.click('[data-cell="A1"]');
      await page1.keyboard.type('Editing');

      // User 2 tries to edit same cell
      await page2.click('[data-cell="A1"]');

      // Should show lock indicator
      await expect(page2.locator('[data-testid="cell-locked"]')).toBeVisible();
      await expect(page2.locator('text=Cell being edited by user1@example.com')).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Simultaneous Editing - Slides', () => {
    test('should show real-time slide updates', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same presentation
      await page1.goto('/slides/shared-presentation-123');
      await page2.goto('/slides/shared-presentation-123');

      // User 1 adds text
      await page1.click('[data-testid="insert-text"]');
      await page1.click('[data-testid="slide-canvas"]', { position: { x: 200, y: 200 } });
      await page1.keyboard.type('Hello from User 1');

      // User 2 should see it
      await expect(page2.locator('[data-testid="slide-canvas"]')).toContainText('Hello from User 1');

      await context1.close();
      await context2.close();
    });

    test('should show which user is editing which object', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same presentation
      await page1.goto('/slides/shared-presentation-123');
      await page2.goto('/slides/shared-presentation-123');

      // User 1 selects text box
      await page1.click('[data-testid="textbox-1"]');

      // User 2 should see user1's selection
      await expect(page2.locator('[data-testid="textbox-1"][data-selected-by="user1@example.com"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('User Presence', () => {
    test('should show online users', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same document
      await page1.goto('/writer/shared-doc-123');
      await page2.goto('/writer/shared-doc-123');

      // Should show both users
      await expect(page1.locator('[data-testid="collaborators"]')).toContainText('2 users online');
      await expect(page1.locator('[data-testid="collaborator"][data-user="user2@example.com"]')).toBeVisible();

      await expect(page2.locator('[data-testid="collaborators"]')).toContainText('2 users online');
      await expect(page2.locator('[data-testid="collaborator"][data-user="user1@example.com"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should update when user leaves', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same document
      await page1.goto('/writer/shared-doc-123');
      await page2.goto('/writer/shared-doc-123');

      // Close page2
      await page2.close();

      // page1 should update
      await expect(page1.locator('[data-testid="collaborators"]')).toContainText('1 user online');
      await expect(page1.locator('[data-testid="collaborator"][data-user="user2@example.com"]')).not.toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should show user activity status', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same document
      await page1.goto('/writer/shared-doc-123');
      await page2.goto('/writer/shared-doc-123');

      // User 2 starts typing
      await page2.locator('[data-testid="editor"]').click();
      await page2.keyboard.type('Typing...');

      // User 1 should see typing indicator
      await expect(page1.locator('[data-testid="user-status"][data-user="user2@example.com"]')).toContainText('typing');

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Comments', () => {
    test('should add comment to document', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      // Select text
      await page.locator('[data-testid="editor"]').click();
      await page.keyboard.type('Comment on this');
      await page.keyboard.press('Control+A');

      // Add comment
      await page.click('[data-testid="add-comment"]');
      await page.fill('textarea[name="comment"]', 'Great point!');
      await page.click('button:has-text("Comment")');

      await expect(page.locator('[data-testid="comment"]')).toContainText('Great point!');
    });

    test('should reply to comment', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      // Reply to existing comment
      await page.click('[data-testid="comment-1"]');
      await page.fill('textarea[name="reply"]', 'I agree!');
      await page.click('button:has-text("Reply")');

      await expect(page.locator('[data-testid="comment-1"] [data-testid="reply"]')).toContainText('I agree!');
    });

    test('should resolve comment', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      await page.click('[data-testid="comment-1"]');
      await page.click('[data-testid="resolve-comment"]');

      await expect(page.locator('[data-testid="comment-1"]')).toHaveClass(/resolved/);
    });

    test('should see real-time comments', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same document
      await page1.goto('/writer/shared-doc-123');
      await page2.goto('/writer/shared-doc-123');

      // User 1 adds comment
      await page1.locator('[data-testid="editor"]').click();
      await page1.keyboard.press('Control+A');
      await page1.click('[data-testid="add-comment"]');
      await page1.fill('textarea[name="comment"]', 'Real-time comment!');
      await page1.click('button:has-text("Comment")');

      // User 2 should see it immediately
      await expect(page2.locator('[data-testid="comment"]')).toContainText('Real-time comment!');

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Version History', () => {
    test('should show version history', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      await page.click('[data-testid="file-menu"]');
      await page.click('text=Version history');

      await expect(page.locator('[data-testid="version-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="version"]')).toHaveCount.greaterThan(0);
    });

    test('should restore previous version', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      await page.click('[data-testid="file-menu"]');
      await page.click('text=Version history');
      await page.click('[data-testid="version-2"]');
      await page.click('button:has-text("Restore this version")');

      await expect(page.locator('text=Version restored')).toBeVisible();
    });

    test('should show who made changes', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      await page.click('[data-testid="file-menu"]');
      await page.click('text=Version history');

      await expect(page.locator('[data-testid="version-author"]')).toBeVisible();
    });
  });

  test.describe('Suggestions Mode', () => {
    test('should enable suggestions mode', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      await page.click('[data-testid="editing-mode"]');
      await page.click('text=Suggesting');

      await expect(page.locator('[data-testid="editing-mode"]')).toContainText('Suggesting');
    });

    test('should create suggestion', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      await page.click('[data-testid="editing-mode"]');
      await page.click('text=Suggesting');

      await page.locator('[data-testid="editor"]').click();
      await page.keyboard.type('This is a suggestion');

      await expect(page.locator('[data-testid="suggestion"]')).toBeVisible();
    });

    test('should accept suggestion', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      await page.click('[data-testid="suggestion-1"]');
      await page.click('[data-testid="accept-suggestion"]');

      await expect(page.locator('[data-testid="suggestion-1"]')).not.toBeVisible();
    });

    test('should reject suggestion', async ({ page }) => {
      await page.goto('/auth/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await page.goto('/writer/doc-123');

      await page.click('[data-testid="suggestion-1"]');
      await page.click('[data-testid="reject-suggestion"]');

      await expect(page.locator('[data-testid="suggestion-1"]')).not.toBeVisible();
    });
  });

  test.describe('Notifications', () => {
    test('should receive notification when mentioned in comment', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Open same document
      await page1.goto('/writer/shared-doc-123');
      await page2.goto('/hub');

      // User 1 mentions user 2 in comment
      await page1.locator('[data-testid="editor"]').click();
      await page1.keyboard.press('Control+A');
      await page1.click('[data-testid="add-comment"]');
      await page1.fill('textarea[name="comment"]', '@user2@example.com Please review');
      await page1.click('button:has-text("Comment")');

      // User 2 should receive notification
      await expect(page2.locator('[data-testid="notifications-badge"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });

    test('should receive notification when document is shared', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      const page2 = await context2.newPage();

      // Login both users
      for (const [page, email] of [[page1, 'user1@example.com'], [page2, 'user2@example.com']]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', email);
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      await page1.goto('/writer/doc-123');
      await page2.goto('/hub');

      // User 1 shares with user 2
      await page1.click('[data-testid="share-button"]');
      await page1.fill('input[name="email"]', 'user2@example.com');
      await page1.click('button:has-text("Share")');

      // User 2 should receive notification
      await expect(page2.locator('[data-testid="notifications-badge"]')).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });
});
