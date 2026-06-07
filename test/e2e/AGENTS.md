# E2E Tests

Puppeteer-based end-to-end tests for the Campaign Builder module.

## Running

```bash
npm test                                                        # Run all E2E tests (headed Chrome)
npm test -- --spec "test/e2e/entries/character.test.ts"         # Run single test file
npm test -- --spec "test/e2e/entries/*.test.ts"                 # Run test files by glob
npm test -- --grep "character"                                   # Run tests matching name pattern
npm run test:coverage                                            # Run with Istanbul coverage
npm run test:rebuild                                             # Reset Foundry world and repopulate test data
```

- Tests run serially (same browser/tab), never in parallel
- `mochaGlobalSetup` launches browser, navigates to Foundry, populates test data, opens Campaign Builder
- Test data persists across runs; use `npm run test:rebuild` to reset


## Code Coverage

Coverage uses Istanbul instrumentation via `vite-plugin-istanbul`.

1. Build with instrumentation: `npm run debug:test`
2. Reload Foundry so it picks up the instrumented build
3. Run tests with coverage: `npm run test:coverage`
4. Run `npx nyc report` to generate the report summary
5. `xdg-open coverage/index.html` to open the HTML report

The `debug:test` build mode adds Istanbul instrumentation to the source code. When tests run, coverage data is collected from `window.__coverage__` in the browser and written to `.nyc_output/`. The `nyc report` command then generates human-readable reports.

If you run `npm test` without an instrumented build, coverage collection is silently skipped.

## Coverage Targets
 
| Area | Target Coverage | Notes |
|------|-----------------|-------|
| **Components** | **95% (ideally 100%)** | Critical - UI must be fully tested |
| Stores | 80% | State management logic |
| Classes | 80% | Business logic |
| Utils | 80% | Helper functions |
| Applications | 80% | Main app files |
| **Migrations** | **0% (excluded)** | Not required |

We allow lower coverage for non-components because everything else is also tested with unit tests.

## Architecture

- `globalSetup.ts` - Mocha global setup/teardown (browser launch, data population, coverage collection)
- `.mocharc.json` - Mocha configuration (serial execution, tsx loader, timeout)
- `sharedContext.ts` - Shared browser/page context
- `helpers.ts` - Puppeteer helpers (Locator class, getByTestId, etc.)
- `types.ts` - Local types (Topics enum) to avoid importing Foundry-dependent code
- `utils/` - Test utilities (settings, dialogs, setup)
- `data/` - Test data generators
- `setup/` - World population utilities

## Test Structure

Tests use **Mocha CLI** with `mochaGlobalSetup`/`mochaGlobalTeardown`:

1. **`mochaGlobalSetup`** runs once before all tests — launches browser, navigates to Foundry, populates test data, opens Campaign Builder.
2. **Mocha discovers test files** via the `spec` glob in `.mocharc.json` — no manual import orchestration needed.
3. **Each suite's `before()`** only does suite-specific setup (e.g., `switchToSetting()`, closing leftover tabs). Browser/data setup is already done.
4. **`mochaGlobalTeardown`** runs once after all tests — collects Istanbul coverage and closes the browser.

### Creating a New Test File

```typescript
import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';

describe('My Test Suite', () => {
  before(async () => {
    // Suite-specific setup (browser/data already initialized by globalSetup)
  });

  it('my test case', async () => {
    const page = sharedContext.page!;
    // Test logic...
  });
});
```


## Key Points

1. **No Foundry imports**: E2E tests run in Node.js and communicate with Foundry via Puppeteer's `page.evaluate()`. Never import from `src/` as it pulls in Foundry-dependent code.

2. **Use agent infrastructure**: The `test/agent/` module handles browser connection, login, navigation, and module interaction. Import from `../agent`.

3. **Test data isolation**: Tests that modify or delete data must create their own objects and clean them up. Never edit data on an object that was created as part of the basic structure during setup (settings, campaigns, sessions, entries, etc.) because it will break other tests.

4. **User experience**: Unless a test is designed to specifically test the module API, it should simulate a real user's actions. This means using the UI elements and interactions that a user would use, rather than directly calling the API.  Tests that need to create their own data for testing purposes should navigate through the app UI to create it as part of the test, as if they were a user, rather than using the API directly.  They should then clean up behind themselves.  Alternately, they can create a new entry, session, campaign, etc. and give it a unique name.  In that case, it shouldn't interfere with the existing test data and could be left behind.

5. **Serial execution**: Tests run in the same UI so can never run in parallel.  Also, each test file should assume it could be run in any order or combination with other files.  This means it should never assume a starting point for the UI - it should confirm the module is open and navigate to the starting point it needs.

6. **Delays**: Only use delay() or setTimeout() or equivalent when needed (for example, to trigger a debounce).  Otherwise, instead wait for specific dom elements to be ready.

## Test Data Guidelines

The `mochaGlobalSetup` in `globalSetup.ts` creates a standard set of test data if none exists:
- 2 settings with entries, campaigns, and sessions
- This data persists across test runs
- **Read-only**: Use this data for navigation, display, and read-only tests
- **Write tests**: Create your own objects within the test and delete them afterward
- Use `npm run test:rebuild` to reset and repopulate test data
