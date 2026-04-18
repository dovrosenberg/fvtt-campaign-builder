# Quench unit testing

## Quench Unit Tests
Unit tests use [Quench](https://github.com/Ethaks/FVTT-Quench), which runs **inside the Foundry VTT environment** — not alongside it. This means all Foundry APIs (`game`, `ui`, `Hooks`, etc.) are available and should be used directly, never stubbed (except `game.settings`).

Tests are loaded only when building with `--mode test` (`npm run debug:test`). They are registered via the `quenchReady` hook in `test/unit/index.ts`, which imports batch registration functions from each category subdirectory.

### Test Structure

Each test file is registered as its own **batch** so users can selectively run them in the Quench UI. Batches are organized by category mirroring `src/`:

| Test Directory | Source Directory |
|---|---|
| `test/unit/utils/` | `src/utils/` |
| `test/unit/classes/` | `src/classes/` |
| `test/unit/applications/stores/` | `src/applications/stores/` |
| `test/unit/settings/` | `src/settings/` |
| `test/unit/components/` | `src/components/` |
| `test/unit/composables/` | `src/composables/` |
| `test/unit/documents/` | `src/documents/` |
| `test/unit/hooks/` | `src/hooks/` |
| `test/unit/dialogs/` | `src/dialogs/` |

### Creating a New Test

1. **Create the test file** `test/unit/[category]/myFeature.test.ts`:

```typescript
import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { functionToTest } from '@/utils/someUtility';
import { getTestSetting } from '@unittest/testUtils';

export const registerMyFeatureTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  describe('functionToTest', () => {
    it('should work correctly', () => {
      const result = functionToTest(testData);
      expect(result).to.equal(expectedValue);
    });
  });
};
```

2. **Register the batch** in `test/unit/[category]/index.ts`:

```typescript
import { createBatch } from '@unittest/testUtils';
import { registerMyFeatureTests } from './myFeature.test';

export const registerMyFeatureBatch = () => {
  createBatch('[category].myFeature', '/[category]/myFeature', registerMyFeatureTests);
};
```

3. **Wire into main runner** in `test/unit/index.ts`:

```typescript
import { registerMyFeatureBatch } from '@unittest/[category]';
registerMyFeatureBatch();
```

### Key Patterns

- **`createBatch()`** from `@unittest/testUtils` handles setup/teardown boilerplate (shared test setting init/cleanup, `sinon.restore()`)
- **One shared FCBSetting** across all batches, managed by `testSettingManager` with mutex + ref counting. Access via `getTestSetting()`
- **Never stub `game` or Foundry APIs** (except `game.settings` — use `settingsHelper.backup()`/`restore()` with try/finally for tests that modify settings)
- **For `ModuleSettings.get` stubs**, use `callsFake()` with call-through to the original, never `withArgs()` (which blocks unmatched calls, returning `undefined`)
- **UUIDs in tests**: Use `fakeUuid('Scene')` for primary documents and `fakeFCBJournalEntryPageUuid()` for embedded FCB pages when you only need valid format, not document resolution. Use real documents when the code resolves the UUID to access properties
- **Vue component tests**: Use `mountComponent()` from `@unittest/vueTestUtils` — tests focus on logic (computed properties, method behavior, event emissions), not visual rendering. PrimeVue is stubbed by default
- **Store stubs**: Use `createStoreStub(useStore, methodStubs)` from `@unittest/stores` for factory-based stubbing, or `stubStoreComputed(sandbox, store, propName, value)` for individual properties

### Running

There is no npm script for Quench tests. To run them:

1. Build the module in test mode: `npm run debug:test`
2. Start Foundry and load a world with the module enabled
3. Open the Quench UI from the Foundry game settings tab and select which batches to run.  At the end of the run a json structure with all the failures is written to the browser console.
