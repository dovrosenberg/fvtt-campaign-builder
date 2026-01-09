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
    }
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
    }
  );
};
```

**Note**: Each test file gets its own batch registration function, allowing users to select which tests to run in the Quench UI.

#### 3. Create individual test files
```typescript
// test/unit/[category]/some.test.ts
import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Entry } from '@/classes';
import { getTestSetting } from '@unittest/testUtils';

export const registerSomeTests = (context: QuenchBatchContext) => {
  const { describe, it, expect, beforeEach } = context;

  describe('some feature', () => {
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
      // Test implementation
    });
  });
};
```

**Note**: Import `getTestSetting` from `@unittest/testUtils` (the global testUtils).

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
```typescript
// Don't change user's current setting
testSetting = (await FCBSetting.create(false, 'Test Setting'))!;

// Settings backup/restore is safe and handles initialization order
await backupSettings();
// ... tests that modify settings ...
await restoreSettings();
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
    }
  );
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
