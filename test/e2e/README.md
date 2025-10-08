# E2E Test Architecture

## Overview

This test suite uses **Playwright fixtures** to enable code splitting while maintaining serial execution order. All tests share the same authenticated browser context and page.

To get started, need to run `npx playwright install` and `sudo npx playwright install-deps`

## File Structure

```
test/e2e/
├── fixtures.ts              # Shared test fixtures (authenticated page/context)
├── auth.ts                  # Authentication helper
├── main.test.ts            # Main feature tests
└── settings/
    └── create-and-delete-setting.test.ts
```

## How It Works

### 1. Shared Fixtures (`fixtures.ts`)
- Extends Playwright's base test with custom fixtures
- `fcbContext`: Browser context with proper viewport and settings
- `fcbPage`: Authenticated page that's ready to use
- Automatically handles initialization via `initializeWorld()`

### 2. Serial Execution
- **Config level**: `fullyParallel: false` + `workers: 1`
- **Test level**: `test.describe.serial()` ensures strict ordering
- All tests share the same browser instance and page

### 3. Usage in Test Files

```typescript
import { test, expect } from './fixtures';  // or '../fixtures'

test.describe.serial('My test suite', () => {
  test('my test', async ({ fcbPage }) => {
    // fcbPage is already authenticated and ready
    await fcbPage.waitForSelector('#my-element');
  });
});
```

## Benefits

✅ **Code splitting**: Tests can be organized in separate files  
✅ **Serial execution**: Tests run in predictable order  
✅ **Shared state**: All tests use the same authenticated session  
✅ **DRY**: No repeated setup/teardown in each file  
✅ **Type safety**: Full TypeScript support with fixtures

## Adding New Test Files

1. Create your test file in the appropriate directory
2. Import from `fixtures.ts`: `import { test, expect } from '../fixtures'`
3. Use `test.describe.serial()` for your test suite
4. Access the authenticated page via `{ fcbPage }` parameter
5. No need for `beforeAll` or `afterAll` - fixtures handle it

## Running Tests

```bash
npm run test                    # Run all tests
npx playwright test main.test.ts  # Run specific file
npx playwright test --headed     # Run with visible browser
```
