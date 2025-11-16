import { test, expect } from '@playwright/test';

/**
 * NEXUS Slides E2E tests
 * Tests presentation creation, slide editing, and presentation mode
 */

test.describe('NEXUS Slides', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/hub/);
  });

  test.describe('Presentation Creation', () => {
    test('should create a new blank presentation @smoke', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await expect(page).toHaveURL(/\/slides\//);
      await expect(page.locator('[data-testid="slide-canvas"]')).toBeVisible();
      await expect(page.locator('[data-testid="presentation-title"]')).toHaveValue('Untitled Presentation');
    });

    test('should create presentation from template', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="templates"]');
      await page.click('[data-testid="template-pitch-deck"]');

      await expect(page).toHaveURL(/\/slides\//);
      await expect(page.locator('[data-testid="slide-thumbnails"]')).toContainText('');
    });
  });

  test.describe('Slide Management', () => {
    test('should add new slide', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="add-slide"]');

      await expect(page.locator('[data-testid="slide-thumbnail"]')).toHaveCount(2);
    });

    test('should delete slide', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="add-slide"]');
      await page.click('[data-testid="slide-thumbnail-2"]', { button: 'right' });
      await page.click('text=Delete slide');

      await expect(page.locator('[data-testid="slide-thumbnail"]')).toHaveCount(1);
    });

    test('should duplicate slide', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="slide-thumbnail-1"]', { button: 'right' });
      await page.click('text=Duplicate slide');

      await expect(page.locator('[data-testid="slide-thumbnail"]')).toHaveCount(2);
    });

    test('should reorder slides', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="add-slide"]');

      const slide1 = page.locator('[data-testid="slide-thumbnail-1"]');
      const slide2 = page.locator('[data-testid="slide-thumbnail-2"]');

      await slide2.dragTo(slide1);

      // Verify order changed
      await expect(page.locator('[data-testid="slide-thumbnail"]').first()).toHaveAttribute('data-slide-id', '2');
    });
  });

  test.describe('Slide Layouts', () => {
    test('should apply title slide layout', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="layout-menu"]');
      await page.click('[data-testid="layout-title"]');

      await expect(page.locator('[data-testid="title-textbox"]')).toBeVisible();
      await expect(page.locator('[data-testid="subtitle-textbox"]')).toBeVisible();
    });

    test('should apply title and content layout', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="layout-menu"]');
      await page.click('[data-testid="layout-title-content"]');

      await expect(page.locator('[data-testid="title-textbox"]')).toBeVisible();
      await expect(page.locator('[data-testid="content-area"]')).toBeVisible();
    });

    test('should apply two column layout', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="layout-menu"]');
      await page.click('[data-testid="layout-two-column"]');

      await expect(page.locator('[data-testid="column-1"]')).toBeVisible();
      await expect(page.locator('[data-testid="column-2"]')).toBeVisible();
    });
  });

  test.describe('Text Editing', () => {
    test('should add and edit text box', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-text"]');
      await page.click('[data-testid="slide-canvas"]', { position: { x: 200, y: 200 } });

      const textbox = page.locator('[data-testid="textbox"]').last();
      await textbox.click();
      await page.keyboard.type('Hello Slides');

      await expect(textbox).toContainText('Hello Slides');
    });

    test('should format text as bold', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-text"]');
      await page.click('[data-testid="slide-canvas"]', { position: { x: 200, y: 200 } });

      const textbox = page.locator('[data-testid="textbox"]').last();
      await textbox.click();
      await page.keyboard.type('Bold text');
      await page.keyboard.press('Control+A');
      await page.click('[data-testid="bold-button"]');

      await expect(textbox.locator('strong')).toBeVisible();
    });

    test('should change font size', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-text"]');
      await page.click('[data-testid="slide-canvas"]', { position: { x: 200, y: 200 } });

      const textbox = page.locator('[data-testid="textbox"]').last();
      await textbox.click();
      await page.keyboard.type('Big text');
      await page.keyboard.press('Control+A');
      await page.click('[data-testid="font-size-dropdown"]');
      await page.click('text=48');

      await expect(textbox).toHaveCSS('font-size', '48px');
    });

    test('should change text color', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-text"]');
      await page.click('[data-testid="slide-canvas"]', { position: { x: 200, y: 200 } });

      const textbox = page.locator('[data-testid="textbox"]').last();
      await textbox.click();
      await page.keyboard.type('Colored text');
      await page.keyboard.press('Control+A');
      await page.click('[data-testid="text-color-button"]');
      await page.click('[data-testid="color-blue"]');

      await expect(textbox).toHaveCSS('color', /blue/i);
    });
  });

  test.describe('Shapes and Images', () => {
    test('should insert rectangle shape', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-shape"]');
      await page.click('[data-testid="shape-rectangle"]');

      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(400, 300);
      await page.mouse.up();

      await expect(page.locator('[data-shape="rectangle"]')).toBeVisible();
    });

    test('should insert circle shape', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-shape"]');
      await page.click('[data-testid="shape-circle"]');

      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(300, 300);
      await page.mouse.up();

      await expect(page.locator('[data-shape="circle"]')).toBeVisible();
    });

    test('should insert arrow shape', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-shape"]');
      await page.click('[data-testid="shape-arrow"]');

      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(400, 200);
      await page.mouse.up();

      await expect(page.locator('[data-shape="arrow"]')).toBeVisible();
    });

    test('should insert image from URL', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-image"]');
      await page.fill('input[name="imageUrl"]', 'https://example.com/image.jpg');
      await page.click('button:has-text("Insert")');

      await expect(page.locator('[data-testid="slide-canvas"] img')).toBeVisible();
    });

    test('should upload and insert image', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-image"]');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'slide-image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-data'),
      });

      await expect(page.locator('[data-testid="slide-canvas"] img')).toBeVisible();
    });
  });

  test.describe('Object Manipulation', () => {
    test('should move object', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-text"]');
      await page.click('[data-testid="slide-canvas"]', { position: { x: 200, y: 200 } });

      const textbox = page.locator('[data-testid="textbox"]').last();
      await page.keyboard.type('Move me');

      const box = await textbox.boundingBox();
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.down();
      await page.mouse.move(300, 300);
      await page.mouse.up();

      const newBox = await textbox.boundingBox();
      expect(newBox!.x).not.toBe(box!.x);
    });

    test('should resize object', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-shape"]');
      await page.click('[data-testid="shape-rectangle"]');

      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(300, 300);
      await page.mouse.up();

      const shape = page.locator('[data-shape="rectangle"]');
      await shape.click();

      const resizeHandle = page.locator('[data-testid="resize-handle-br"]');
      const handleBox = await resizeHandle.boundingBox();

      await page.mouse.move(handleBox!.x, handleBox!.y);
      await page.mouse.down();
      await page.mouse.move(handleBox!.x + 100, handleBox!.y + 100);
      await page.mouse.up();

      const newShapeBox = await shape.boundingBox();
      expect(newShapeBox!.width).toBeGreaterThan(100);
    });

    test('should rotate object', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-shape"]');
      await page.click('[data-testid="shape-rectangle"]');

      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(300, 300);
      await page.mouse.up();

      const shape = page.locator('[data-shape="rectangle"]');
      await shape.click();

      const rotateHandle = page.locator('[data-testid="rotate-handle"]');
      const handleBox = await rotateHandle.boundingBox();

      await page.mouse.move(handleBox!.x, handleBox!.y);
      await page.mouse.down();
      await page.mouse.move(handleBox!.x + 50, handleBox!.y - 50);
      await page.mouse.up();

      await expect(shape).toHaveCSS('transform', /rotate/);
    });

    test('should delete object', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-text"]');
      await page.click('[data-testid="slide-canvas"]', { position: { x: 200, y: 200 } });

      const textbox = page.locator('[data-testid="textbox"]').last();
      await textbox.click();
      await page.keyboard.press('Delete');

      await expect(textbox).not.toBeVisible();
    });

    test('should bring object to front', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      // Insert two shapes
      await page.click('[data-testid="insert-shape"]');
      await page.click('[data-testid="shape-rectangle"]');
      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(300, 300);
      await page.mouse.up();

      await page.click('[data-testid="insert-shape"]');
      await page.click('[data-testid="shape-circle"]');
      await page.mouse.move(250, 250);
      await page.mouse.down();
      await page.mouse.move(350, 350);
      await page.mouse.up();

      // Bring rectangle to front
      const rectangle = page.locator('[data-shape="rectangle"]');
      await rectangle.click({ button: 'right' });
      await page.click('text=Bring to front');

      await expect(rectangle).toHaveCSS('z-index', /[1-9]/);
    });
  });

  test.describe('Themes and Backgrounds', () => {
    test('should apply theme to presentation', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="themes-menu"]');
      await page.click('[data-testid="theme-modern"]');

      await expect(page.locator('[data-testid="slide-canvas"]')).toHaveClass(/theme-modern/);
    });

    test('should change slide background color', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="slide-settings"]');
      await page.click('[data-testid="bg-color-button"]');
      await page.click('[data-testid="color-blue"]');

      await expect(page.locator('[data-testid="slide-canvas"]')).toHaveCSS('background-color', /blue/i);
    });

    test('should set slide background image', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="slide-settings"]');
      await page.click('[data-testid="bg-image-button"]');
      await page.fill('input[name="imageUrl"]', 'https://example.com/background.jpg');
      await page.click('button:has-text("Apply")');

      await expect(page.locator('[data-testid="slide-canvas"]')).toHaveCSS('background-image', /url/);
    });
  });

  test.describe('Presentation Mode', () => {
    test('should start presentation from beginning @smoke', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="present-button"]');

      await expect(page.locator('[data-testid="presentation-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="slide-number"]')).toContainText('1');
    });

    test('should navigate slides with arrow keys', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="add-slide"]');
      await page.click('[data-testid="present-button"]');

      await page.keyboard.press('ArrowRight');
      await expect(page.locator('[data-testid="slide-number"]')).toContainText('2');

      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('[data-testid="slide-number"]')).toContainText('1');
    });

    test('should exit presentation mode with Escape', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="present-button"]');
      await page.keyboard.press('Escape');

      await expect(page.locator('[data-testid="presentation-view"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="slide-canvas"]')).toBeVisible();
    });
  });

  test.describe('Transitions and Animations', () => {
    test('should add slide transition', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="transitions-menu"]');
      await page.click('[data-testid="transition-fade"]');

      await expect(page.locator('[data-testid="transition-applied"]')).toBeVisible();
    });

    test('should add object animation', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="insert-text"]');
      await page.click('[data-testid="slide-canvas"]', { position: { x: 200, y: 200 } });

      const textbox = page.locator('[data-testid="textbox"]').last();
      await textbox.click();

      await page.click('[data-testid="animations-menu"]');
      await page.click('[data-testid="animation-fly-in"]');

      await expect(page.locator('[data-testid="animation-applied"]')).toBeVisible();
    });
  });

  test.describe('Export and Share', () => {
    test('should download as PDF', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="file-menu"]');
      await page.click('text=Download as PDF');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should download as PPTX', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="file-menu"]');
      await page.click('text=Download as PPTX');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.pptx');
    });

    test('should share presentation', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-presentation"]');

      await page.click('[data-testid="share-button"]');
      await page.fill('input[name="email"]', 'colleague@example.com');
      await page.click('button:has-text("Share")');

      await expect(page.locator('text=Presentation shared')).toBeVisible();
    });
  });
});
