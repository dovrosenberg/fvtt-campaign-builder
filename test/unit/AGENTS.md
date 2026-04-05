# Unit Testing Guidelines

## Overview
This document outlines the approach for unit testing in the FoundryVTT Campaign Builder module. Due to the deep integration with FoundryVTT's systems, we use integration testing rather than pure unit testing.

## Testing Philosophy

### No Stubbing of FoundryVTT APIs
- **Never stub `game` or its core properties, other than game.settings** - Quench runs inside the actual Foundry environment
- Use real FoundryVTT APIs and objects

### Integration Testing Approach
Since Quench tests run inside the actual FoundryVTT environment:
1. Back up all module settings before tests start and restore them at the end
2. Create real objects (Settings, Entries, etc.)
3. Test with actual data structures
4. **Create ONE test FCBSetting that is shared across ALL test batches.** The setting is created when the first batch initializes and deleted when the last batch cleans up. Individual objects created within this setting don't need individual cleanup since deleting the parent setting will cascade delete everything.
5. Avoid interfering with user's current data

## Test Structure

### Global Shared Test Setting Pattern

For optimal performance and consistency, ALL test batches share a single global FCBSetting managed by `test/unit/testUtils.ts`. This uses a mutex pattern with reference counting to prevent race conditions when batches run in parallel.

#### 1. testUtils.ts — Helper Classes and Utilities

`test/unit/testUtils.ts` provides four key exports:

- **`createBatch(batchName, displayName, registerTests)`** — Standard batch registration with `initializeTestSetting`/`cleanupTestSetting`/`sinon.restore()` boilerplate. Use this in every `index.ts`.
- **`testSettingManager`** (`TestSettingManager` class) — Manages the shared FCBSetting lifecycle with mutex + ref counting. Backward-compat wrappers: `initializeTestSetting()`, `getTestSetting()`, `cleanupTestSetting()`.
- **`rollTableHelper`** (`RollTableTestHelper` class) — Tracks RollTables/folders for cleanup. Key method: `trackSettingTables(setting)` replaces repeated track loops. Backward-compat wrappers: `trackRollTable()`, `trackRollTableFolder()`, `cleanupRollTables()`.
- **`settingsHelper`** (`SettingsTestHelper` class) — Queue-based backup/restore for module settings. Backward-compat wrappers: `backupSettings()`, `restoreSettings()`.

#### 2. Create individual batch registration files
```typescript
// test/unit/[category]/index.ts
import { createBatch } from '@unittest/testUtils';
import { registerSomeTests } from "./some.test";
import { registerOtherTests } from "./other.test";

export const registerSomeBatch = () => {
  createBatch(
    '[category].some',
    '/[category]/some',
    registerSomeTests
  );
};

export const registerOtherBatch = () => {
  createBatch(
    '[category].other',
    '/[category]/other',
    registerOtherTests
  );
};
```

**Note**: Each test file gets its own batch registration function, allowing users to select which tests to run in the Quench UI. `createBatch` handles all setup/teardown boilerplate (`initializeTestSetting`, `cleanupTestSetting`, `sinon.restore()`).

#### 3. Create individual test files
```typescript
// test/unit/[category]/some.test.ts
import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Entry } from '@/classes';
import { getTestSetting } from '@unittest/testUtils';
// Import the module being tested directly
import { functionToTest } from '@/utils/someUtility';

export const registerSomeTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach } = context;

  // No outer describe wrapper - each test file is its own batch
  describe('functionToTest', () => {
    let testEntries: Entry[];
    
    beforeEach(async () => {
      // Get the shared test setting
      const testSetting = getTestSetting();
      
      // Create test data within the existing setting
      testEntries = [
        (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test Character 1'
        }))!,
        // ...
      ];
    });
    
    it('should work correctly', async () => {
      // Use getTestSetting() in tests
      const testSetting = getTestSetting();
      // Call imported functions directly
      const result = functionToTest(testEntries[0]);
      expect(result).to.equal(expectedValue);
    });
  });
};
```

**Key Points**:
- Import `getTestSetting` from `@unittest/testUtils` (the global testUtils)
- Import utility functions/classes to be tested, as well as any to be mocked directly from their modules (NO dynamic imports)
- No outer `describe` wrapper since each test file is registered as its own batch
- Call imported functions directly, not through a dynamic import object

### Key Principles
1. **Create with `makeCurrent=false`** - Avoid changing the user's active setting
2. **Clean up properly** - Delete created objects to prevent data pollution
3. **Use real UUIDs** - Test with actual UUIDs from created objects
4. **Settings backup/restore is safe** - The functions handle unregistered settings gracefully
5. **One global setting** - Share the testSetting across all test batches
6. **Separate batches** - Each test file is its own batch for selective execution

## Test Categories

### Utility Functions
- Test with real FCB objects
- Example: `filterRelatedEntries` tests with actual Setting and Entry objects

### Classes and Methods
- Create instances of the class being tested
- Test methods with real data
- Verify side effects on actual FoundryVTT objects

### Vue Components
Unit tests for Vue components focus on **logic only**, not UX/visual behavior. UX testing is handled by Playwright E2E tests (or not at all).

#### What to Test
- Computed property calculations
- Method behavior and return values (including event handlers)
- Event emissions (emit payloads)
- Prop validation and defaults
- Watcher side effects
- Conditional rendering logic (e.g., "error class applied when invalid")

#### What NOT to Test (use Playwright instead)
- Visual rendering and styling
- User interactions and UX flows - except starting at the event handler level
- Accessibility
- PrimeVue component behavior

#### Test Utilities
Use `mountComponent()` from `@unittest/vueTestUtils`:

```typescript
import { mountComponent, flushPromises } from '@unittest/vueTestUtils';
import MyComponent from '@/components/MyComponent.vue';

export const registerMyComponentTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  describe('MyComponent', () => {
    it('emits update event with correct payload', async () => {
      const { wrapper } = mountComponent(MyComponent, {
        props: { modelValue: 'initial' }
      });

      await wrapper.find('input').setValue('new value');
      expect(wrapper.emitted('update:modelValue')?.[0]).to.deep.equal(['new value']);
    });

    it('computes derived value correctly', async () => {
      const { wrapper } = mountComponent(MyComponent, {
        props: { count: 5 }
      });

      expect(wrapper.vm.doubledCount).to.equal(10);
    });
  });
};
```

#### Key Design Decisions
1. **Store stubbing**: Explicit opt-in - tests must specify which stores to stub
2. **PrimeVue**: Stubbed by default - we test logic, not UI
3. **`localize()`**: Stubbed to return the key itself - catches missing strings
4. **DOM assertions**: Minimal - only verify logic outcomes

#### Store Stubs in Component Tests
When a component uses Pinia stores, stub them explicitly:

```typescript
const { wrapper, storeStubs } = mountComponent(MyComponent, {
  props: { title: 'Test' },
  stores: {
    main: { currentSetting: mockSetting },
    navigation: { openContent: sinon.stub().resolves() }
  }
});
```

## Common Patterns

### Testing with Real Data
```typescript
// Instead of mocking UUIDs, use real ones
added = [testEntries.character1.uuid];
removed = [testEntries.character2.uuid];

// Use getTestSetting() to access the shared setting
await filterRelatedEntries(getTestSetting(), added, removed);

expect(added).to.deep.equal([testEntries.character1.uuid]);
```

### Avoiding Side Effects

#### Settings Backup/Restore Pattern

For tests that modify module settings, use the queue-based backup/restore system to prevent interference between tests:

```typescript
import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { moduleId, SettingKey } from '@/settings';
import { settingsHelper } from '@unittest/testUtils';

export const registerSettingsTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  describe('settings modification', () => {
    it('should not modify settings - no backup needed', async () => {
      // Tests that only READ settings don't need backup
      const value = game.settings?.get(moduleId, SettingKey.startCollapsed);
      expect(typeof value).to.not.equal('undefined');
    });

    it('should modify settings safely', async () => {
      // Tests that MODIFY settings must backup/restore
      await settingsHelper.backup();
      
      try {
        // Modify settings
        await game.settings?.set(moduleId, SettingKey.startCollapsed, true);
        
        // Test logic
        const value = game.settings?.get(moduleId, SettingKey.startCollapsed);
        expect(value).to.equal(true);
      } finally {
        // Always restore in finally to ensure cleanup
        await settingsHelper.restore();
      }
    });
  });
};
```

**Key Points:**
1. **Only tests that MODIFY settings** need to call `settingsHelper.backup()` and `settingsHelper.restore()`
2. Use **try/finally** to ensure settings are restored even if tests fail
3. The queue system ensures tests run sequentially: Test 1 backup → Test 1 restore → Test 2 backup → Test 2 restore
4. Tests that only read settings don't need any backup
5. Backward-compat wrappers `backupSettings()` / `restoreSettings()` are also available

#### General Data Management
```typescript
// Don't change user's current setting
testSetting = (await FCBSetting.create(false, 'Test Setting'))!;

// For non-settings data, create within test setting
const testEntry = await Entry.create(testSetting.topicFolders[Topics.Character]!, {
  name: 'Test Character'
});
```

## What NOT to Do

❌ **Don't stub FoundryVTT APIs**
```typescript
// WRONG
sinon.stub(game.settings, 'get');
```

❌ **Don't create per-directory testUtils files**
```typescript
// WRONG - Don't create testUtils.ts in subdirectories
import { getTestSetting } from './testUtils'; // Don't do this!
```
Use the global testUtils from `@unittest/testUtils` instead.

❌ **Don't use invalid UUID formats with DocumentUUIDField**
```typescript
// WRONG - These don't match Foundry's UUID format
testArc.storyWebs = ['sw-1', 'sw-2', 'sw-3'];  // Missing document type!
await relationshipStore.addScene('scene-123');  // Missing document type!
```
Foundry's `DocumentUUIDField` validates UUID format: `Type.16chars` where Type is a valid document type and ID is 16 alphanumeric characters. It does **not** verify the document exists.

❌ **Don't use `withArgs()` for ModuleSettings.get stubs**
```typescript
// WRONG - withArgs returns undefined for unmatched calls, breaking other code
sandbox.stub(ModuleSettings, 'get').withArgs(SettingKey.useFronts).returns(true);
// This causes ModuleSettings.get(SettingKey.settingIndex) to return undefined!
// Which breaks FCBJournalEntryPage.settingId getter (needs settingIndex to find packId)
```

The `withArgs()` pattern blocks ALL unmatched calls, returning `undefined`. This breaks any code that depends on other settings being accessible during the test.

## What TO Do

✅ **Use createBatch for batch registration**
```typescript
// RIGHT - Use createBatch from testUtils
import { createBatch } from '@unittest/testUtils';
import { registerMyTests } from './my.test';

export const registerMyBatch = () => {
  createBatch(
    'category.mytest',
    '/category/mytest',
    registerMyTests
  );
};
```

✅ **Import modules directly and use batch-level describe**
```typescript
// RIGHT - Import utility functions directly
import { functionToTest, otherFunction } from '@/utils/someUtility';
import { getTestSetting } from '@unittest/testUtils';

export const registerMyTests = (context: QuenchBatchContext) => {
  const { describe, it, expect } = context;

  // No outer describe wrapper - batch registration handles grouping
  describe('functionToTest', () => {
    it('should work correctly', () => {
      // Call imported functions directly
      const result = functionToTest(testData);
      expect(result).to.equal(expectedValue);
    });
  });

  describe('otherFunction', () => {
    it('should handle edge cases', () => {
      // Direct function calls
      expect(() => otherFunction(null)).to.not.throw();
    });
  });
};
```

✅ **Test integration points**
```typescript
// RIGHT - Test how components work together
await filterRelatedEntries(getTestSetting(), added, removed);
```

✅ **Use `callsFake()` for ModuleSettings.get stubs with call-through**
```typescript
// RIGHT - Capture original before stubbing to avoid recursion
const originalGet = ModuleSettings.get.bind(ModuleSettings);
sandbox.stub(ModuleSettings, 'get').callsFake((key: SettingKey) => {
  if (key === SettingKey.useFronts) return true;
  return originalGet(key);
});
```

**Critical**: Must capture the original function BEFORE stubbing. Calling `ModuleSettings.get` inside the fake creates infinite recursion because the stub replaces the method.

✅ **Use fakeUuid for primary document UUIDs (when document resolution isn't needed)**
```typescript
import { fakeUuid, fakeFCBJournalEntryPageUuid } from '@unittest/testUtils';

// For primary documents (Scene, Actor, Item, RollTable, JournalEntry):
const sceneUuid = fakeUuid('Scene');
const actorUuid = fakeUuid('Actor');
const storyWebUuid = fakeUuid('JournalEntry');  // StoryWeb stored as JournalEntry

// Use in store tests
testArc.storyWebs = [fakeUuid('JournalEntry'), fakeUuid('JournalEntry')];
await testArc.save();

await relationshipStore.addScene(sceneUuid);
await relationshipStore.addActor(actorUuid);
```

✅ **Use fakeFCBJournalEntryPageUuid for embedded document UUIDs**
```typescript
import { fakeFCBJournalEntryPageUuid } from '@unittest/testUtils';

// For FCBJournalEntryPage subtypes (Entry, Campaign, Session, Arc, Front, StoryWeb, Setting):
const entryUuid = fakeFCBJournalEntryPageUuid();  // JournalEntry.xxx.JournalEntryPage.yyy

// Use in store tests for locations, participants, NPCs
await arcStore.addLocation(fakeFCBJournalEntryPageUuid());
await sessionStore.addNPC(fakeFCBJournalEntryPageUuid());
```

**When to use fake UUIDs vs real documents:**
- **Use `fakeUuid`** for primary documents (Scene, Actor, Item) when testing storage/reordering
- **Use `fakeFCBJournalEntryPageUuid`** for Entry/FCB document UUIDs when testing storage/reordering
- **Use real documents** when the code resolves the UUID to access document properties

**Fields that use DocumentUUIDField:**
- `Entry.scenes` — Array of Scene UUIDs (use `fakeUuid`)
- `Entry.actors` — Array of Actor UUIDs (use `fakeUuid`)
- `Entry.foundryDocuments` — Array of any Foundry document UUIDs
- `Campaign.storyWebs`, `Session.storyWebs`, `Arc.storyWebs` — Array of JournalEntry UUIDs (use `fakeUuid`)
- `Arc.locations`, `Arc.participants` — Objects with Entry UUIDs (use `fakeFCBJournalEntryPageUuid`)
- `Session.locations`, `Session.npcs` — Objects with Entry UUIDs (use `fakeFCBJournalEntryPageUuid`)
- `RelatedEntryDetails.uuid` in relationships — Entry UUIDs (needs real Entry for name/topic)

## File Organization

Test directories mirror `src/` categories:

| Test Directory | Source Directory | Status |
|---|---|---|
| `test/unit/utils/` | `src/utils/` | Active |
| `test/unit/classes/` | `src/classes/` | Active |
| `test/unit/applications/stores/` | `src/applications/stores/` | Active |
| `test/unit/settings/` | `src/settings/` | Active |
| `test/unit/components/` | `src/components/` | Active |
| `test/unit/composables/` | `src/composables/` | Scaffolded |
| `test/unit/documents/` | `src/documents/` | Scaffolded |
| `test/unit/hooks/` | `src/hooks/` | Scaffolded |
| `test/unit/dialogs/` | `src/dialogs/` | Scaffolded |

Each test file has its own batch registration function. Use descriptive test names that explain what is being tested.

### Setting up a New Test

Scaffolded directories already have an `index.ts` with a commented template. To add a test:

1. **Create the test file** `test/unit/[category]/myFeature.test.ts` (follow the test file pattern above)

2. **Add batch registration** in `test/unit/[category]/index.ts`:
   ```typescript
   import { createBatch } from '@unittest/testUtils';
   import { registerMyFeatureTests } from './myFeature.test';

   export const registerMyFeatureBatch = () => {
     createBatch(
       '[category].myFeature',
       '/[category]/myFeature',
       registerMyFeatureTests
     );
   };
   ```

3. **Wire into main runner** in `test/unit/index.ts`:
   ```typescript
   import { registerMyFeatureBatch } from '@unittest/[category]';
   registerMyFeatureBatch();
   ```

### Store Stubs

Store stubs live in `test/unit/stores/`:

- **`backendStoreStubs.ts`** / **`mainStoreStubs.ts`** — Domain-specific stubs with sensible defaults
- **`createStoreStub(useStore, methodStubs, propertyOverrides)`** — Generic factory for quickly stubbing any Pinia store. Use for new stores that don't need complex defaults.
- **`stubStoreComputed(sandbox, store, propName, value)`** — Stubs a store property (including read-only computed properties) so it returns the given value. Cleaned up automatically by `sandbox.restore()`.
- **`testPinia.ts`** — Shared Pinia instance for all test store stubs

```typescript
import { createStoreStub, stubStoreComputed } from '@unittest/stores';
import { useNavigationStore, useMainStore } from '@/applications/stores';

// Factory approach for stubbing an entire store
const { store, stubs } = createStoreStub(useNavigationStore, {
  openContent: sinon.stub().resolves(),
});

// Per-property approach for stubbing individual computed properties
const mainStore = useMainStore();
stubStoreComputed(sandbox, mainStore, 'currentTab', { header: { uuid: 'x' }, tabType: WindowTabType.Entry });
stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
```

### Component Test Utilities

`test/unit/componentTestUtils.ts` provides helpers to reduce boilerplate in Vue component tests:

#### Emit Assertions

```typescript
import { assertEmitted, assertNotEmitted, getEmitPayload } from '@unittest/componentTestUtils';

// Assert event was emitted with payload (expect from Quench context)
assertEmitted(expect, wrapper, 'update:modelValue', 0, 'new value');

// Assert event was NOT emitted
assertNotEmitted(expect, wrapper, 'submit');

// Get payload from emission (no expect needed - just returns value)
const value = getEmitPayload<string>(wrapper, 'update:modelValue');
```

#### v-model Testing

```typescript
import { testVModel, testVModelRender } from '@unittest/componentTestUtils';

// Test v-model binding (sets value + checks emit)
await testVModel(expect, wrapper, 'test value');

// Test v-model prop renders correctly
testVModelRender(expect, wrapper, 'initial value');
```

#### Mock Documents

For prop testing where full document functionality isn't needed:

```typescript
import { createMockSetting, createMockEntry, createMockCampaign } from '@unittest/componentTestUtils';

const setting = createMockSetting({ name: 'My Setting' });
const entry = createMockEntry({ name: 'John', topic: Topics.Character });
const campaign = createMockCampaign({ completed: false });
```

**Note**: These are plain objects, NOT real Foundry documents. Use real documents when testing document methods or Foundry integration.

#### Store Stub Presets

Quick setup for common store configurations:

```typescript
import {
  createMinimalMainStoreStub,
  createNavigationStoreStub,
  createRelationshipStoreStub,
} from '@unittest/componentTestUtils';

// Minimal main store with just currentSetting
const { store } = createMinimalMainStoreStub();

// Navigation store with stubbed methods
const { store, stubs } = createNavigationStoreStub();
await store.openContent('some-uuid');
expect(stubs.openContent.calledOnce).to.be.true;
```

#### Input Event Helpers

```typescript
import { typeInInput, clickButton, selectOption, toggleCheckbox } from '@unittest/componentTestUtils';

await typeInInput(wrapper, 'input[name="title"]', 'New Title');
await clickButton(wrapper, 'button.submit');
await selectOption(wrapper, 'select', 'option2');
await toggleCheckbox(wrapper, 'input[type="checkbox"]', true);
```

### RollTable Test Pattern

For tests that create RollTables, use `rollTableHelper` to avoid manual tracking boilerplate:

```typescript
import { rollTableHelper } from '@unittest/testUtils';

beforeEach(async () => {
  await NameGeneratorsService.initializeSettingRollTables(testSetting);
  rollTableHelper.trackSettingTables(testSetting);
});

afterEach(async () => {
  await rollTableHelper.cleanup();
  await rollTableHelper.clearConfig(testSetting);
});
```

## Benefits of This Approach

1. **Selective Test Execution**: Users can choose which test batches to run in the Quench UI
2. **Shared Resources**: All tests share the same setting, reducing setup/teardown overhead
3. **Race Condition Prevention**: Mutex pattern ensures safe concurrent execution
4. **Automatic Cleanup**: Setting is cleaned up only when all batches are complete
5. **Zero Boilerplate**: `createBatch` eliminates duplicated setup/teardown code
6. **Scalable Store Stubs**: `createStoreStub` factory handles new stores without hand-rolling each one

## Remember
Quench runs INSIDE FoundryVTT, not alongside it. This means we have access to all FoundryVTT APIs and should use them rather than mocking them.
