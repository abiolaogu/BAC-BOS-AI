# NEXUS Office Suite - End-to-End Tests

Comprehensive E2E testing suite using Playwright for testing the NEXUS Office Suite across all applications and features.

## Overview

This test suite provides comprehensive coverage of:
- **Authentication**: Registration, login, password reset, OAuth
- **Writer**: Document creation, editing, formatting, collaboration
- **Sheets**: Spreadsheet operations, formulas, data management
- **Slides**: Presentation creation, editing, slide management
- **Drive**: File upload/download, folder management, sharing
- **Meet**: Video conferencing, screen sharing, meeting features
- **Hub**: Dashboard, navigation, cross-app integration
- **Collaboration**: Real-time editing, presence, comments, suggestions

## Prerequisites

- Node.js 18+ and npm
- Chrome, Firefox, and/or Safari installed
- NEXUS services running locally or accessible test environment

## Installation

```bash
cd tests/e2e
npm install

# Install Playwright browsers
npm run install:browsers
```

## Configuration

Configure test environment in `.env`:

```env
BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```

Modify `playwright.config.ts` to customize:
- Test timeout
- Number of workers
- Browser configuration
- Retry logic
- Screenshot/video settings

## Running Tests

### Run all tests
```bash
npm test
```

### Run in headed mode (see browser)
```bash
npm run test:headed
```

### Run in UI mode (interactive)
```bash
npm run test:ui
```

### Run in debug mode
```bash
npm run test:debug
```

### Run specific browser
```bash
npm run test:chrome
npm run test:firefox
npm run test:webkit
```

### Run mobile tests
```bash
npm run test:mobile
```

### Run smoke tests only
```bash
npm run test:smoke
```

### Run specific test suite
```bash
npm run test:auth       # Authentication tests
npm run test:writer     # Writer tests
npm run test:sheets     # Sheets tests
npm run test:slides     # Slides tests
npm run test:drive      # Drive tests
npm run test:meet       # Meet tests
npm run test:hub        # Hub tests
npm run test:collaboration  # Collaboration tests
```

### Run specific test file
```bash
npx playwright test tests/auth.spec.ts
```

### Run specific test
```bash
npx playwright test tests/auth.spec.ts -g "should login successfully"
```

## Test Reports

After running tests, view the HTML report:

```bash
npm run report
```

Reports include:
- Test results with pass/fail status
- Screenshots of failures
- Videos of failed tests
- Execution time
- Error messages and stack traces

## Test Structure

```
tests/e2e/
├── tests/
│   ├── auth.spec.ts           # Authentication tests
│   ├── writer.spec.ts         # Writer tests
│   ├── sheets.spec.ts         # Sheets tests
│   ├── slides.spec.ts         # Slides tests
│   ├── drive.spec.ts          # Drive tests
│   ├── meet.spec.ts           # Meet tests
│   ├── hub.spec.ts            # Hub tests
│   └── collaboration.spec.ts  # Collaboration tests
├── global-setup.ts            # Global setup before all tests
├── global-teardown.ts         # Global teardown after all tests
├── playwright.config.ts       # Playwright configuration
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

## Writing Tests

### Basic test structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/login');
    // Login, navigate, etc.
  });

  test('should do something', async ({ page }) => {
    // Test code
    await page.click('[data-testid="button"]');
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

### Best practices

1. **Use data-testid attributes**: Prefer `[data-testid=""]` over CSS selectors
2. **Use page object pattern**: For complex pages, create page objects
3. **Use beforeEach for setup**: Keep tests independent
4. **Test user flows**: Test complete user journeys, not just individual features
5. **Use tags**: Tag important tests with `@smoke` for quick validation
6. **Handle async properly**: Always await promises
7. **Use explicit waits**: Use `waitForURL`, `waitForSelector` when needed
8. **Clean up after tests**: Ensure tests don't leave data/state

### Testing real-time features

For testing collaboration features with multiple users:

```typescript
test('should show real-time updates', async ({ browser }) => {
  // Create two contexts (two users)
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();

  const context2 = await browser.newContext();
  const page2 = await context2.newPage();

  // Login both users
  // Test real-time features

  // Cleanup
  await context1.close();
  await context2.close();
});
```

### Testing with permissions

For tests requiring camera/microphone (Meet):

```typescript
test('should join video call', async ({ page, context }) => {
  // Grant permissions
  await context.grantPermissions(['camera', 'microphone']);

  // Test video call features
});
```

## CI/CD Integration

Tests are automatically run in CI/CD pipeline (see `.github/workflows/test.yml`):

- Triggered on every push and PR
- Run in parallel across multiple browsers
- Generate test reports
- Upload coverage to Codecov

## Debugging

### Debug a failing test
```bash
npx playwright test tests/auth.spec.ts --debug
```

### Show browser while testing
```bash
npx playwright test --headed
```

### Slow down execution
```bash
npx playwright test --headed --slow-mo=1000
```

### Take screenshot manually
```typescript
await page.screenshot({ path: 'screenshot.png' });
```

### Record video
Videos are automatically recorded for failed tests. Find them in `test-results/`.

### Inspect element
Use Playwright Inspector:
```bash
npx playwright test --debug
```

## Coverage

Test coverage includes:

- **Authentication**: 100%
  - Registration, login, logout
  - Password reset
  - OAuth integration
  - Session management

- **Writer**: 95%
  - Document creation and editing
  - Text formatting
  - Images and media
  - Collaboration features

- **Sheets**: 95%
  - Spreadsheet operations
  - Formulas and calculations
  - Data operations
  - Collaboration

- **Slides**: 90%
  - Presentation creation
  - Slide editing
  - Presentation mode
  - Collaboration

- **Drive**: 95%
  - File upload/download
  - Folder management
  - Sharing and permissions
  - Search and filter

- **Meet**: 85%
  - Meeting creation and joining
  - Video/audio controls
  - Screen sharing
  - Chat and participants

- **Hub**: 90%
  - Dashboard
  - Navigation
  - Search
  - Settings

- **Collaboration**: 90%
  - Real-time editing
  - User presence
  - Comments and suggestions
  - Version history

## Performance

- **Parallel execution**: Tests run in parallel across multiple workers
- **Browser reuse**: Browsers are reused between tests when possible
- **Selective testing**: Use tags to run only relevant tests
- **Test isolation**: Each test runs in its own context

## Troubleshooting

### Tests are flaky
- Increase timeouts in `playwright.config.ts`
- Add explicit waits with `waitForSelector`
- Check for race conditions
- Use `waitForLoadState('networkidle')`

### Tests fail in CI but pass locally
- Check for environment-specific issues
- Verify dependencies are installed
- Check for timing issues (CI may be slower)
- Review browser versions

### Element not found
- Check if element is visible: `await expect(element).toBeVisible()`
- Wait for element: `await page.waitForSelector('[data-testid="element"]')`
- Check selector: Use Playwright Inspector

### Authentication issues
- Verify test credentials in environment
- Check if session is persisting
- Clear cookies/storage if needed

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright API Reference](https://playwright.dev/docs/api/class-playwright)
- [NEXUS Development Guide](../../docs/development.md)

## Contributing

When adding new tests:
1. Follow existing test structure
2. Use descriptive test names
3. Add comments for complex logic
4. Tag smoke tests with `@smoke`
5. Ensure tests are independent
6. Clean up test data
7. Update this README if adding new test files

## License

MIT
