# Unit Testing Guidelines

## Overview
This document outlines the approach for unit testing in the FoundryVTT Campaign Builder module. Due to the deep integration with FoundryVTT's systems, we use integration testing rather than pure unit testing.

## Testing Philosophy

### No Stubbing of FoundryVTT APIs
- **Never stub `game.settings`** - This breaks integration with FoundryVTT
- **Never stub `game` or its core properties** - Quench runs inside the actual Foundry environment
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

#### 1. Global testUtils.ts (already exists)
```typescript
// test/unit/testUtils.ts
import { FCBSetting } from '@/classes';

// Global shared test setting
let testSetting: FCBSetting | undefined;

// Reference counting to track active test batches
let activeBatches = 0;

// Mutex to prevent race conditions
let isLocked = false;
const lockQueue: Array<() => void> = [];

/**
 * Initialize the shared test setting
 * Increments reference count for each calling batch
 */
export const initializeTestSetting = async () => {
  await acquireLock();
  
  try {
    // Increment reference count
    activeBatches++;
    
    // If setting already exists, just return it
    if (testSetting) {
      return testSetting;
    }
    
    // Create new setting
    testSetting = (await FCBSetting.create(false, 'Global Test Setting'))!;
    return testSetting;
  } finally {
    releaseLock();
  }
};

/**
 * Get the current test setting
 */
export const getTestSetting = (): FCBSetting => {
  if (!testSetting) {
    throw new Error('Test setting not initialized. Call initializeTestSetting() first.');
  }
  return testSetting;
};

/**
 * Decrements reference count and queues cleanup if no active batches remain
 */
export const cleanupTestSetting = async () => {
  await acquireLock();
  
  try {
    // Decrement reference count
    activeBatches = Math.max(0, activeBatches - 1);
    
    // Only cleanup if there are no active batches
    if (activeBatches === 0 && testSetting) {
      await testSetting.delete();
      testSetting = undefined;
    }
  } finally {
    releaseLock();
  }
};
```

#### 2. Create individual batch registration files
```typescript
// test/unit/[category]/index.ts
import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { initializeTestSetting, cleanupTestSetting } from '@unittest/testUtils';
import { registerSomeTests } from "./some.test";
import { registerOtherTests } from "./other.test";

export const registerSomeBatch = () => {
  quench?.registerBatch(
    'campaign-builder.[category].some',
    (context: QuenchBatchContext) => {
      const { before, after } = context;

      // Batch-level setup
      before(async () => {
        await initializeTestSetting();
      });

      // Batch-level cleanup
      after(async () => {
        await cleanupTestSetting();
        sinon.restore();
      });

      // Register tests
      registerSomeTests(context);
    },
    { displayName: "/[category]/some", preSelected: false },
  );
};

export const registerOtherBatch = () => {
  quench?.registerBatch(
    'campaign-builder.[category].other',
    (context: QuenchBatchContext) => {
      const { before, after } = context;

      // Batch-level setup
      before(async () => {
        await initializeTestSetting();
      });

      // Batch-level cleanup
      after(async () => {
        await cleanupTestSetting();
        sinon.restore();
      });

      // Register tests
      registerOtherTests(context);
    },
    { displayName: "/[category]/other", preSelected: false },
  );
};
```

**Note**: Each test file gets its own batch registration function, allowing users to select which tests to run in the Quench UI.

**Batch Registration Options**:
- `displayName`: The path shown in the Quench UI for this test batch (e.g., "/utils/appWindow")
- `preSelected`: Whether this batch is selected by default (typically `false`)

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

### UI Components
- Do not use unit tests for UI components

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
import { backupSettings, restoreSettings } from '@unittest/testUtils';

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
      await backupSettings();
      
      try {
        // Modify settings
        await game.settings?.set(moduleId, SettingKey.startCollapsed, true);
        
        // Test logic
        const value = game.settings?.get(moduleId, SettingKey.startCollapsed);
        expect(value).to.equal(true);
      } finally {
        // Always restore in finally to ensure cleanup
        await restoreSettings();
      }
    });
  });
};
```

**Key Points:**
1. **Only tests that MODIFY settings** need to call `backupSettings()` and `restoreSettings()`
2. Use **try/finally** to ensure settings are restored even if tests fail
3. The queue system ensures tests run sequentially: Test 1 backup → Test 1 restore → Test 2 backup → Test 2 restore
4. Tests that only read settings don't need any backup

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

## What TO Do

✅ **Use global shared test setting**
```typescript
// RIGHT - Import from global testUtils
import { getTestSetting } from '@unittest/testUtils';

// Each batch registers independently
export const registerMyBatch = () => {
  quench?.registerBatch(
    'campaign-builder.category.mytest',
    (context: QuenchBatchContext) => {
      const { before, after } = context;

      before(async () => {
        await initializeTestSetting();
      });

      after(async () => {
        await cleanupTestSetting();
        sinon.restore();
      });

      registerMyTests(context);
    },
    { displayName: "/category/mytest", preSelected: false },
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

## File Organization
- Place tests in `test/unit/utils/` for utilities
- Place tests in `test/unit/classes/` for class tests
- Each test file has its own batch registration function
- Use descriptive test names that explain what is being tested

### Setting up a New Test Directory

When creating a new test directory from scratch:

1. **Create the directory structure**:
   ```
   test/unit/[category]/
   ├── index.ts          # Batch registration functions
   ├── some.test.ts      # Individual test files
   └── other.test.ts
   ```

2. **Create index.ts** with batch registration functions (see template above)

3. **Create test files** (follow the pattern in step 3)

4. **Register in main test runner**:
   ```typescript
   // In test/unit/index.ts or main test file
   import { registerSomeBatch, registerOtherBatch } from './[category]/index';
   
   // Call the registration functions
   registerSomeBatch();
   registerOtherBatch();
   ```

## Benefits of This Approach

1. **Selective Test Execution**: Users can choose which test batches to run in the Quench UI
2. **Shared Resources**: All tests share the same setting, reducing setup/teardown overhead
3. **Race Condition Prevention**: Mutex pattern ensures safe concurrent execution
4. **Automatic Cleanup**: Setting is cleaned up only when all batches are complete
5. **Simplified Structure**: No need for per-directory testUtils files

## Remember
Quench runs INSIDE FoundryVTT, not alongside it. This means we have access to all FoundryVTT APIs and should use them rather than mocking them.
