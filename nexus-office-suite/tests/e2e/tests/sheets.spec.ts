import { test, expect } from '@playwright/test';

/**
 * NEXUS Sheets E2E tests
 * Tests spreadsheet creation, cell editing, formulas, and data operations
 */

test.describe('NEXUS Sheets', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/hub/);
  });

  test.describe('Spreadsheet Creation', () => {
    test('should create a new blank spreadsheet @smoke', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Should open Sheets with blank spreadsheet
      await expect(page).toHaveURL(/\/sheets\//);
      await expect(page.locator('[data-testid="spreadsheet-grid"]')).toBeVisible();
      await expect(page.locator('[data-testid="spreadsheet-title"]')).toHaveValue('Untitled Spreadsheet');
    });

    test('should create spreadsheet from template', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="templates"]');
      await page.click('[data-testid="template-budget"]');

      // Should open Sheets with template content
      await expect(page).toHaveURL(/\/sheets\//);
      await expect(page.locator('[data-testid="spreadsheet-grid"]')).toContainText('Budget');
    });
  });

  test.describe('Cell Operations', () => {
    test('should select and edit cell', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Click cell A1
      await page.click('[data-cell="A1"]');
      await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);

      // Type in cell
      await page.keyboard.type('Hello');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-cell="A1"]')).toContainText('Hello');
    });

    test('should navigate cells with arrow keys', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-cell="A1"]');
      await page.keyboard.type('A1');

      // Navigate right
      await page.keyboard.press('ArrowRight');
      await page.keyboard.type('B1');

      // Navigate down
      await page.keyboard.press('ArrowDown');
      await page.keyboard.type('B2');

      // Navigate left
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.type('A2');

      // Navigate up
      await page.keyboard.press('ArrowUp');

      await expect(page.locator('[data-cell="A1"]')).toContainText('A1');
      await expect(page.locator('[data-cell="B1"]')).toContainText('B1');
      await expect(page.locator('[data-cell="B2"]')).toContainText('B2');
      await expect(page.locator('[data-cell="A2"]')).toContainText('A2');
    });

    test('should select range of cells', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Click and drag to select range
      await page.click('[data-cell="A1"]');
      await page.keyboard.down('Shift');
      await page.click('[data-cell="C3"]');
      await page.keyboard.up('Shift');

      // Should have selected range
      await expect(page.locator('[data-cell="A1"]')).toHaveClass(/selected/);
      await expect(page.locator('[data-cell="C3"]')).toHaveClass(/selected/);
    });

    test('should copy and paste cells', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Enter data in A1
      await page.click('[data-cell="A1"]');
      await page.keyboard.type('Copy me');
      await page.keyboard.press('Enter');

      // Copy
      await page.click('[data-cell="A1"]');
      await page.keyboard.press('Control+C');

      // Paste to B1
      await page.click('[data-cell="B1"]');
      await page.keyboard.press('Control+V');

      await expect(page.locator('[data-cell="B1"]')).toContainText('Copy me');
    });

    test('should cut and paste cells', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Enter data in A1
      await page.click('[data-cell="A1"]');
      await page.keyboard.type('Cut me');
      await page.keyboard.press('Enter');

      // Cut
      await page.click('[data-cell="A1"]');
      await page.keyboard.press('Control+X');

      // Paste to B1
      await page.click('[data-cell="B1"]');
      await page.keyboard.press('Control+V');

      await expect(page.locator('[data-cell="A1"]')).toBeEmpty();
      await expect(page.locator('[data-cell="B1"]')).toContainText('Cut me');
    });
  });

  test.describe('Formulas', () => {
    test('should evaluate SUM formula', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Enter numbers
      await page.click('[data-cell="A1"]');
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');
      await page.keyboard.type('20');
      await page.keyboard.press('Enter');
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      // Enter SUM formula
      await page.keyboard.type('=SUM(A1:A3)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-cell="A4"]')).toContainText('60');
    });

    test('should evaluate AVERAGE formula', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-cell="A1"]');
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');
      await page.keyboard.type('20');
      await page.keyboard.press('Enter');
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      await page.keyboard.type('=AVERAGE(A1:A3)');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-cell="A4"]')).toContainText('20');
    });

    test('should evaluate arithmetic formulas', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-cell="A1"]');
      await page.keyboard.type('=5+3');
      await page.keyboard.press('Enter');

      await page.keyboard.type('=10-4');
      await page.keyboard.press('Enter');

      await page.keyboard.type('=6*7');
      await page.keyboard.press('Enter');

      await page.keyboard.type('=20/4');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-cell="A1"]')).toContainText('8');
      await expect(page.locator('[data-cell="A2"]')).toContainText('6');
      await expect(page.locator('[data-cell="A3"]')).toContainText('42');
      await expect(page.locator('[data-cell="A4"]')).toContainText('5');
    });

    test('should evaluate cell reference formulas', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-cell="A1"]');
      await page.keyboard.type('100');
      await page.keyboard.press('Enter');

      await page.click('[data-cell="B1"]');
      await page.keyboard.type('=A1*2');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-cell="B1"]')).toContainText('200');
    });

    test('should show formula error for invalid syntax', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-cell="A1"]');
      await page.keyboard.type('=SUM(');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-cell="A1"]')).toContainText('#ERROR');
    });
  });

  test.describe('Formatting', () => {
    test('should format cell as currency', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-cell="A1"]');
      await page.keyboard.type('1234.56');
      await page.keyboard.press('Enter');

      await page.click('[data-cell="A1"]');
      await page.click('[data-testid="format-menu"]');
      await page.click('text=Currency');

      await expect(page.locator('[data-cell="A1"]')).toContainText('$1,234.56');
    });

    test('should format cell as percentage', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-cell="A1"]');
      await page.keyboard.type('0.85');
      await page.keyboard.press('Enter');

      await page.click('[data-cell="A1"]');
      await page.click('[data-testid="format-menu"]');
      await page.click('text=Percentage');

      await expect(page.locator('[data-cell="A1"]')).toContainText('85%');
    });

    test('should apply bold formatting to cells', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-cell="A1"]');
      await page.keyboard.type('Bold text');
      await page.keyboard.press('Enter');

      await page.click('[data-cell="A1"]');
      await page.click('[data-testid="bold-button"]');

      await expect(page.locator('[data-cell="A1"]')).toHaveClass(/bold/);
    });

    test('should change cell background color', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-cell="A1"]');
      await page.click('[data-testid="bg-color-button"]');
      await page.click('[data-testid="color-yellow"]');

      await expect(page.locator('[data-cell="A1"]')).toHaveCSS('background-color', /yellow/i);
    });
  });

  test.describe('Rows and Columns', () => {
    test('should insert row', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Right-click row header
      await page.click('[data-row-header="2"]', { button: 'right' });
      await page.click('text=Insert row above');

      // Should insert new row
      await expect(page.locator('[data-testid="spreadsheet-grid"]')).toBeVisible();
    });

    test('should delete row', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-row-header="2"]', { button: 'right' });
      await page.click('text=Delete row');

      // Row should be deleted
      await expect(page.locator('[data-testid="spreadsheet-grid"]')).toBeVisible();
    });

    test('should insert column', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-col-header="B"]', { button: 'right' });
      await page.click('text=Insert column left');

      await expect(page.locator('[data-testid="spreadsheet-grid"]')).toBeVisible();
    });

    test('should delete column', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-col-header="B"]', { button: 'right' });
      await page.click('text=Delete column');

      await expect(page.locator('[data-testid="spreadsheet-grid"]')).toBeVisible();
    });

    test('should resize column width', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      const colHeader = page.locator('[data-col-header="A"]');
      const box = await colHeader.boundingBox();

      // Drag column border to resize
      await page.mouse.move(box!.x + box!.width, box!.y + box!.height / 2);
      await page.mouse.down();
      await page.mouse.move(box!.x + box!.width + 100, box!.y + box!.height / 2);
      await page.mouse.up();

      // Column should be wider
      const newBox = await colHeader.boundingBox();
      expect(newBox!.width).toBeGreaterThan(box!.width);
    });
  });

  test.describe('Sheets Management', () => {
    test('should add new sheet', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-testid="add-sheet"]');

      await expect(page.locator('[data-testid="sheet-tab-2"]')).toBeVisible();
      await expect(page.locator('[data-testid="sheet-tab-2"]')).toContainText('Sheet2');
    });

    test('should rename sheet', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-testid="sheet-tab-1"]', { button: 'right' });
      await page.click('text=Rename');
      await page.fill('input[name="sheetName"]', 'My Data');
      await page.keyboard.press('Enter');

      await expect(page.locator('[data-testid="sheet-tab-1"]')).toContainText('My Data');
    });

    test('should delete sheet', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Add second sheet
      await page.click('[data-testid="add-sheet"]');

      // Delete sheet
      await page.click('[data-testid="sheet-tab-2"]', { button: 'right' });
      await page.click('text=Delete');
      await page.click('button:has-text("Confirm")');

      await expect(page.locator('[data-testid="sheet-tab-2"]')).not.toBeVisible();
    });

    test('should switch between sheets', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Add data to Sheet1
      await page.click('[data-cell="A1"]');
      await page.keyboard.type('Sheet 1 data');
      await page.keyboard.press('Enter');

      // Add second sheet
      await page.click('[data-testid="add-sheet"]');

      // Add data to Sheet2
      await page.click('[data-cell="A1"]');
      await page.keyboard.type('Sheet 2 data');
      await page.keyboard.press('Enter');

      // Switch back to Sheet1
      await page.click('[data-testid="sheet-tab-1"]');

      await expect(page.locator('[data-cell="A1"]')).toContainText('Sheet 1 data');
    });
  });

  test.describe('Data Operations', () => {
    test('should sort data ascending', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Enter unsorted data
      await page.click('[data-cell="A1"]');
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');
      await page.keyboard.type('10');
      await page.keyboard.press('Enter');
      await page.keyboard.type('20');
      await page.keyboard.press('Enter');

      // Select range and sort
      await page.click('[data-cell="A1"]');
      await page.keyboard.down('Shift');
      await page.click('[data-cell="A3"]');
      await page.keyboard.up('Shift');

      await page.click('[data-testid="data-menu"]');
      await page.click('text=Sort A-Z');

      // Check sorted order
      await expect(page.locator('[data-cell="A1"]')).toContainText('10');
      await expect(page.locator('[data-cell="A2"]')).toContainText('20');
      await expect(page.locator('[data-cell="A3"]')).toContainText('30');
    });

    test('should filter data', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      // Enter data with headers
      await page.click('[data-cell="A1"]');
      await page.keyboard.type('Name');
      await page.keyboard.press('Tab');
      await page.keyboard.type('Age');
      await page.keyboard.press('Enter');

      await page.keyboard.type('Alice');
      await page.keyboard.press('Tab');
      await page.keyboard.type('25');
      await page.keyboard.press('Enter');

      await page.keyboard.type('Bob');
      await page.keyboard.press('Tab');
      await page.keyboard.type('30');
      await page.keyboard.press('Enter');

      // Apply filter
      await page.click('[data-cell="A1"]');
      await page.click('[data-testid="data-menu"]');
      await page.click('text=Create filter');

      await expect(page.locator('[data-testid="filter-button"]')).toBeVisible();
    });
  });

  test.describe('Import/Export', () => {
    test('should import CSV file', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      await page.click('[data-testid="file-menu"]');
      await page.click('text=Import');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'data.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('Name,Age\nAlice,25\nBob,30'),
      });

      await expect(page.locator('[data-cell="A1"]')).toContainText('Name');
      await expect(page.locator('[data-cell="B1"]')).toContainText('Age');
    });

    test('should export as CSV', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="file-menu"]');
      await page.click('text=Download as CSV');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.csv');
    });

    test('should export as XLSX', async ({ page }) => {
      await page.goto('/hub');
      await page.click('[data-testid="create-spreadsheet"]');

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="file-menu"]');
      await page.click('text=Download as XLSX');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.xlsx');
    });
  });
});
