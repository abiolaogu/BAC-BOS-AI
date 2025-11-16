# Testing Guide

**Version**: 1.0

---

## Unit Testing

### Go Tests

```go
// backend/writer-service/handlers/document_test.go
func TestCreateDocument(t *testing.T) {
    // Setup
    db := setupTestDB()
    handler := NewDocumentHandler(db)

    // Test
    doc := &Document{Title: "Test"}
    result, err := handler.Create(doc)

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, result.ID)
    assert.Equal(t, "Test", result.Title)
}
```

**Run tests**:
```bash
go test ./...
go test -v -cover ./...
```

### JavaScript/TypeScript Tests

```typescript
// frontend/hub-app/__tests__/DocumentList.test.tsx
import { render, screen } from '@testing-library/react';
import DocumentList from '../components/DocumentList';

describe('DocumentList', () => {
  it('renders documents', () => {
    const docs = [{ id: '1', title: 'Doc 1' }];
    render(<DocumentList documents={docs} />);
    expect(screen.getByText('Doc 1')).toBeInTheDocument();
  });
});
```

**Run tests**:
```bash
npm test
npm run test:watch
npm run test:coverage
```

---

## Integration Testing

```javascript
// backend/api-gateway/__tests__/integration/documents.test.js
describe('Documents API', () => {
  let token;

  beforeAll(async () => {
    // Login and get token
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    token = res.body.token;
  });

  it('creates document', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Doc' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test Doc');
  });
});
```

---

## E2E Testing

### Playwright Tests

```typescript
// e2e/documents.spec.ts
import { test, expect } from '@playwright/test';

test('create and edit document', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'password');
  await page.click('button[type=submit]');

  // Create document
  await page.click('text=New Document');
  await expect(page).toHaveURL(/.*documents\/*/);

  // Edit document
  await page.fill('[contenteditable]', 'Hello World');
  await page.waitForTimeout(1000); // Auto-save
  await expect(page.locator('.save-indicator')).toHaveText('Saved');
});
```

**Run E2E tests**:
```bash
npm run test:e2e
npm run test:e2e:ui  # Visual mode
```

---

## Test Coverage

### Goals

- **Unit tests**: > 80% coverage
- **Integration tests**: Critical paths covered
- **E2E tests**: Main user journeys covered

### Generate Coverage Report

```bash
# Go
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# JavaScript
npm run test:coverage
open coverage/lcov-report/index.html
```

---

**Previous**: [Contributing](02-contributing.md) | **Next**: [Deployment →](04-deployment.md)
