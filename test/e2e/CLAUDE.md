## E2E Tests

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
- **Never import from `src/` in E2E tests** — it pulls in Foundry-dependent code. E2E tests communicate via Puppeteer's `page.evaluate()`
- Write tests that simulate real user UI interactions rather than calling APIs directly
- Tests that modify data must create their own objects and clean up afterward
