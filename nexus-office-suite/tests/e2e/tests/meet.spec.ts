import { test, expect } from '@playwright/test';

/**
 * NEXUS Meet E2E tests
 * Tests video conferencing, screen sharing, and meeting features
 */

test.describe('NEXUS Meet', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant permissions for camera and microphone
    await context.grantPermissions(['camera', 'microphone']);

    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/hub/);
  });

  test.describe('Meeting Creation', () => {
    test('should create instant meeting @smoke', async ({ page }) => {
      await page.goto('/meet');

      await page.click('[data-testid="new-meeting-button"]');

      await expect(page).toHaveURL(/\/meet\/.+/);
      await expect(page.locator('[data-testid="video-container"]')).toBeVisible();
    });

    test('should schedule future meeting', async ({ page }) => {
      await page.goto('/meet');

      await page.click('[data-testid="schedule-meeting-button"]');
      await page.fill('input[name="title"]', 'Team Standup');
      await page.fill('input[name="date"]', '2025-12-01');
      await page.fill('input[name="time"]', '10:00');
      await page.fill('input[name="duration"]', '30');
      await page.click('button:has-text("Schedule")');

      await expect(page.locator('text=Meeting scheduled')).toBeVisible();
    });

    test('should generate meeting link', async ({ page }) => {
      await page.goto('/meet');

      await page.click('[data-testid="new-meeting-button"]');

      await expect(page.locator('[data-testid="meeting-link"]')).toHaveValue(/https:\/\/.+\/meet\/.+/);
    });
  });

  test.describe('Joining Meeting', () => {
    test('should join meeting with link', async ({ page }) => {
      const meetingId = 'abc-defg-hij';
      await page.goto(`/meet/${meetingId}`);

      await page.click('button:has-text("Join")');

      await expect(page.locator('[data-testid="video-container"]')).toBeVisible();
    });

    test('should join meeting with code', async ({ page }) => {
      await page.goto('/meet/join');

      await page.fill('input[name="meetingCode"]', 'abc-defg-hij');
      await page.click('button:has-text("Join")');

      await expect(page).toHaveURL(/\/meet\/abc-defg-hij/);
    });

    test('should show preview before joining', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');

      await expect(page.locator('[data-testid="preview-video"]')).toBeVisible();
      await expect(page.locator('[data-testid="mic-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="camera-toggle"]')).toBeVisible();
    });

    test('should join with camera off', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');

      await page.click('[data-testid="camera-toggle"]');
      await page.click('button:has-text("Join")');

      await expect(page.locator('[data-testid="camera-off-indicator"]')).toBeVisible();
    });

    test('should join with mic muted', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');

      await page.click('[data-testid="mic-toggle"]');
      await page.click('button:has-text("Join")');

      await expect(page.locator('[data-testid="mic-muted-indicator"]')).toBeVisible();
    });
  });

  test.describe('Video Controls', () => {
    test('should toggle camera on/off', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="camera-toggle"]');
      await expect(page.locator('[data-testid="camera-off-indicator"]')).toBeVisible();

      await page.click('[data-testid="camera-toggle"]');
      await expect(page.locator('[data-testid="camera-off-indicator"]')).not.toBeVisible();
    });

    test('should toggle microphone on/off', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="mic-toggle"]');
      await expect(page.locator('[data-testid="mic-muted-indicator"]')).toBeVisible();

      await page.click('[data-testid="mic-toggle"]');
      await expect(page.locator('[data-testid="mic-muted-indicator"]')).not.toBeVisible();
    });

    test('should change camera device', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="settings-button"]');
      await page.click('[data-testid="camera-settings"]');
      await page.selectOption('select[name="cameraDevice"]', '1');

      await expect(page.locator('text=Camera changed')).toBeVisible();
    });

    test('should change microphone device', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="settings-button"]');
      await page.click('[data-testid="mic-settings"]');
      await page.selectOption('select[name="micDevice"]', '1');

      await expect(page.locator('text=Microphone changed')).toBeVisible();
    });
  });

  test.describe('Screen Sharing', () => {
    test('should start screen sharing', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="share-screen-button"]');

      await expect(page.locator('[data-testid="screen-share-active"]')).toBeVisible();
    });

    test('should stop screen sharing', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="share-screen-button"]');
      await page.click('[data-testid="stop-share-button"]');

      await expect(page.locator('[data-testid="screen-share-active"]')).not.toBeVisible();
    });
  });

  test.describe('Participants', () => {
    test('should show participants list', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="participants-button"]');

      await expect(page.locator('[data-testid="participants-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="participant-count"]')).toBeVisible();
    });

    test('should show participant video tiles', async ({ browser }) => {
      const context1 = await browser.newContext();
      await context1.grantPermissions(['camera', 'microphone']);
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      await context2.grantPermissions(['camera', 'microphone']);
      const page2 = await context2.newPage();

      // Login both users
      for (const page of [page1, page2]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Join same meeting
      await page1.goto('/meet/abc-defg-hij');
      await page1.click('button:has-text("Join")');

      await page2.goto('/meet/abc-defg-hij');
      await page2.click('button:has-text("Join")');

      // Should see both participants
      await expect(page1.locator('[data-testid="video-tile"]')).toHaveCount(2);
      await expect(page2.locator('[data-testid="video-tile"]')).toHaveCount(2);

      await context1.close();
      await context2.close();
    });

    test('should pin participant video', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.hover('[data-testid="video-tile-1"]');
      await page.click('[data-testid="pin-button"]');

      await expect(page.locator('[data-testid="video-tile-1"]')).toHaveClass(/pinned/);
    });

    test('should mute participant (host only)', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="participants-button"]');
      await page.hover('[data-participant="user-2"]');
      await page.click('[data-testid="mute-participant"]');

      await expect(page.locator('[data-participant="user-2"] [data-testid="muted-icon"]')).toBeVisible();
    });

    test('should remove participant (host only)', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="participants-button"]');
      await page.hover('[data-participant="user-2"]');
      await page.click('[data-testid="remove-participant"]');
      await page.click('button:has-text("Confirm")');

      await expect(page.locator('[data-participant="user-2"]')).not.toBeVisible();
    });
  });

  test.describe('Chat', () => {
    test('should send chat message', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="chat-button"]');
      await page.fill('[data-testid="chat-input"]', 'Hello everyone!');
      await page.click('[data-testid="send-message"]');

      await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Hello everyone!');
    });

    test('should receive chat messages', async ({ browser }) => {
      const context1 = await browser.newContext();
      await context1.grantPermissions(['camera', 'microphone']);
      const page1 = await context1.newPage();

      const context2 = await browser.newContext();
      await context2.grantPermissions(['camera', 'microphone']);
      const page2 = await context2.newPage();

      // Login both users
      for (const page of [page1, page2]) {
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
      }

      // Join same meeting
      await page1.goto('/meet/abc-defg-hij');
      await page1.click('button:has-text("Join")');

      await page2.goto('/meet/abc-defg-hij');
      await page2.click('button:has-text("Join")');

      // Send message from page1
      await page1.click('[data-testid="chat-button"]');
      await page1.fill('[data-testid="chat-input"]', 'Test message');
      await page1.click('[data-testid="send-message"]');

      // page2 should receive it
      await page2.click('[data-testid="chat-button"]');
      await expect(page2.locator('[data-testid="chat-messages"]')).toContainText('Test message');

      await context1.close();
      await context2.close();
    });

    test('should show unread message indicator', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      // Simulate receiving a message
      await expect(page.locator('[data-testid="chat-button"] [data-testid="unread-badge"]')).toBeVisible();
    });
  });

  test.describe('Recording', () => {
    test('should start recording (host only)', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="more-options"]');
      await page.click('text=Start recording');

      await expect(page.locator('[data-testid="recording-indicator"]')).toBeVisible();
      await expect(page.locator('text=Recording')).toBeVisible();
    });

    test('should stop recording', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="more-options"]');
      await page.click('text=Start recording');
      await page.click('[data-testid="stop-recording"]');

      await expect(page.locator('[data-testid="recording-indicator"]')).not.toBeVisible();
      await expect(page.locator('text=Recording stopped')).toBeVisible();
    });
  });

  test.describe('Breakout Rooms', () => {
    test('should create breakout rooms', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="more-options"]');
      await page.click('text=Breakout rooms');
      await page.fill('input[name="roomCount"]', '3');
      await page.click('button:has-text("Create rooms")');

      await expect(page.locator('[data-testid="breakout-room"]')).toHaveCount(3);
    });

    test('should assign participants to rooms', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="more-options"]');
      await page.click('text=Breakout rooms');
      await page.fill('input[name="roomCount"]', '2');
      await page.click('button:has-text("Create rooms")');

      await page.dragAndDrop('[data-participant="user-2"]', '[data-room="1"]');

      await expect(page.locator('[data-room="1"]')).toContainText('user-2');
    });
  });

  test.describe('Meeting Settings', () => {
    test('should enable waiting room', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');

      await page.click('[data-testid="meeting-settings"]');
      await page.check('input[name="waitingRoom"]');
      await page.click('button:has-text("Save")');

      await expect(page.locator('text=Waiting room enabled')).toBeVisible();
    });

    test('should lock meeting', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="more-options"]');
      await page.click('text=Lock meeting');

      await expect(page.locator('[data-testid="meeting-locked-icon"]')).toBeVisible();
    });

    test('should set meeting password', async ({ page }) => {
      await page.goto('/meet');

      await page.click('[data-testid="schedule-meeting-button"]');
      await page.fill('input[name="title"]', 'Secure Meeting');
      await page.check('input[name="requirePassword"]');
      await page.fill('input[name="password"]', 'secret123');
      await page.click('button:has-text("Schedule")');

      await expect(page.locator('text=Password protected')).toBeVisible();
    });
  });

  test.describe('Virtual Backgrounds', () => {
    test('should apply blur background', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');

      await page.click('[data-testid="effects-button"]');
      await page.click('[data-testid="blur-background"]');
      await page.click('button:has-text("Join")');

      await expect(page.locator('[data-testid="background-applied"]')).toBeVisible();
    });

    test('should apply image background', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');

      await page.click('[data-testid="effects-button"]');
      await page.click('[data-testid="background-image-1"]');
      await page.click('button:has-text("Join")');

      await expect(page.locator('[data-testid="background-applied"]')).toBeVisible();
    });

    test('should upload custom background', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');

      await page.click('[data-testid="effects-button"]');
      await page.click('[data-testid="upload-background"]');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'custom-bg.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      await expect(page.locator('[data-testid="custom-background"]')).toBeVisible();
    });
  });

  test.describe('Meeting End', () => {
    test('should leave meeting', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="leave-button"]');

      await expect(page).toHaveURL(/\/meet$/);
    });

    test('should end meeting for all (host only)', async ({ page }) => {
      await page.goto('/meet/abc-defg-hij');
      await page.click('button:has-text("Join")');

      await page.click('[data-testid="end-meeting-button"]');
      await page.click('button:has-text("End for all")');

      await expect(page.locator('text=Meeting ended')).toBeVisible();
      await expect(page).toHaveURL(/\/meet$/);
    });
  });

  test.describe('Meeting History', () => {
    test('should show past meetings', async ({ page }) => {
      await page.goto('/meet');

      await page.click('[data-testid="history-tab"]');

      await expect(page.locator('[data-testid="past-meeting"]')).toBeVisible();
    });

    test('should view meeting details', async ({ page }) => {
      await page.goto('/meet');

      await page.click('[data-testid="history-tab"]');
      await page.click('[data-testid="past-meeting-1"]');

      await expect(page.locator('[data-testid="meeting-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="participants-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="meeting-duration"]')).toBeVisible();
    });

    test('should access meeting recording', async ({ page }) => {
      await page.goto('/meet');

      await page.click('[data-testid="history-tab"]');
      await page.click('[data-testid="past-meeting-1"]');

      await expect(page.locator('[data-testid="recording-link"]')).toBeVisible();
    });
  });
});
