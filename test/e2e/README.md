# E2E Test Architecture

## Overview

This test suite uses **Puppeteer** for end-to-end testing. All tests share the same authenticated browser context and page.

### Headed Mode (Default)

Tests run in a visible Chrome window using swiftshader for WebGL compatibility. This works on both WSL2 and native Linux.

**One-time setup:**

```bash
# Install Google Chrome (Ubuntu/Debian)
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
sudo apt-get update && sudo apt-get install google-chrome-stable
```

**Run tests:**

```bash
npm test
```

**Note:** Foundry will show a warning about no hardware acceleration. This is expected - swiftshader provides software WebGL rendering which is sufficient for testing.

### Attach Mode (Optional)

For full hardware acceleration, connect to a Windows browser via remote debugging. This requires manual setup:


1. **Start Edge with remote debugging** (from Windows PowerShell):

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0 --user-data-dir="C:\temp\foundry-edge"
```

2. **Run tests with attach mode:**

```bash
BROWSER_MODE=attach npm test
```

**Note:** Use `npm test` to run E2E tests. Only use `npm run debug` (which rebuilds the module) if application code was changed. If only test code was modified, no rebuild is needed.

#### The first time testing is setup, need to configure portproxy/firewall:

From elevated Windows PowerShell, run the commands in scripts\setup-debug-proxy.ps1


## Running Tests

```bash
npm test                                        # Run all tests
npm test -- --file directory/basic               # Run only directory/basic.test
npm test -- --file entries/character --file entries/location  # Run multiple files
npm test -- --grep "character"                   # Run suites/tests matching "character"
npm test -- --file entries/character --grep "name"  # Combine file + grep filters
npm run test:coverage                            # Run all tests with coverage report
npm run test:rebuild                             # Reset world and repopulate test data
```

**Note:** Use `npm test` to run E2E tests. Only use `npm run debug` (which rebuilds the module) if application code was changed. If only test code was modified, no rebuild is needed.

### Test Filtering

- **`--file <path>`** - Filter by test file path (relative to `test/e2e/`, without `.test.ts`). Can be specified multiple times.
- **`--grep <pattern>`** - Filter by suite or test name (case-insensitive substring match). If a suite name matches, all its tests run. Otherwise, only matching tests within each suite run.

### Code Coverage

Coverage uses Istanbul instrumentation via `vite-plugin-istanbul`.

1. Build with instrumentation: `npm run debug:test`
2. Reload Foundry so it picks up the instrumented build
3. Run tests with coverage: `npm run test:coverage`
4. Run `npx nyc report` to generate the report summary
5. `xdg-open coverage/index.html` to open the HTML report

If you run `npm test` without an instrumented build, coverage collection is silently skipped.

## Architecture

- `testRunner.ts` - Custom Jest-like test runner (describe/test/beforeAll/afterAll/expect)
- `ensureSetup.ts` - Browser connection and Foundry setup using agent infrastructure
- `sharedContext.ts` - Shared browser/page context
- `helpers.ts` - Puppeteer helpers (Locator class, getByTestId, etc.)
- `types.ts` - Local types (Topics enum) to avoid importing Foundry-dependent code
- `utils/` - Test utilities (settings, dialogs, setup)
- `data/` - Test data generators
- `setup/` - World population utilities

## Test Data Guidelines

The `ensureSetup(true)` call creates a standard set of test data:
- 2 settings with entries, campaigns, and sessions
- This data persists across test runs (check with `testDataExists()`)
- **Read-only**: Use this data for navigation, display, and read-only tests
- **Write tests**: Create your own objects within the test and delete them afterward
