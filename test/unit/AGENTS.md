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
4. **Create ONE test FCBSetting at the beginning of the test batch and reuse it for ALL tests in the batch.** Delete this setting only once at the very end. Individual objects created within this setting don't need individual cleanup since deleting the parent setting will cascade delete everything.
5. Avoid interfering with user's current data

## Test Structure

### Shared Test Setting Pattern

For optimal performance and consistency, each test directory should use a single shared FCBSetting across all test files in that directory. **Each test directory must have its own `testUtils.ts` file** to prevent conflicts between different test categories.

**Important**: Do not share a single `testUtils.ts` across multiple test directories. Each directory (e.g., `utils/`, `classes/`, etc.) should have its own version with its own `testSetting` variable to avoid conflicts when tests run in parallel.

#### 1. Create a testUtils.ts file
```typescript
// test/unit/[category]/testUtils.ts
import { FCBSetting } from '@/classes';

/**
 * Shared test utilities for [category] tests
 */
export let testSetting: FCBSetting | undefined;

/**
 * Initialize the shared test setting
 */
export const initializeTestSetting = async () => {
  testSetting = (await FCBSetting.create(false, '[Category] Test Setting'))!;
};

/**
 * Clean up the shared test setting
 */
export const cleanupTestSetting = async () => {
  if (testSetting) {
    await testSetting.delete();
    testSetting = undefined;
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
```

#### 2. Create or update the index.ts file
```typescript
// test/unit/[category]/index.ts
import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { initializeTestSetting, cleanupTestSetting } from './testUtils';
import { registerSomeTests } from "./some.test";
import { registerOtherTests } from "./other.test";

export const register[Category]Tests = () => {
  quench?.registerBatch(
    'campaign-builder.[category]',
    (context: QuenchBatchContext) => {
      const { describe, before, after } = context;

      // Batch-level setup - create once for all tests
      before(async () => {
        await initializeTestSetting();
      });

      // Batch-level cleanup - delete once after all tests
      after(async () => {
        await cleanupTestSetting();
        sinon.restore();
      });

      // Register individual test suites with their own describe blocks
      describe('some', () => {
        registerSomeTests(context);
      });
      
      describe('other', () => {
        registerOtherTests(context);
      });
    }
  );
};
```

**Note**: If the `index.ts` file doesn't exist yet, create it. This file serves as the entry point for all tests in the category and must be imported in the main test runner.

#### 3. Create individual test files
```typescript
// test/unit/[category]/some.test.ts
import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { Entry } from '@/classes';
import { getTestSetting } from './testUtils';

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

**Note**: Create test files as needed for the functionality you're testing. Each test file should export a registration function that accepts the Quench context and uses `getTestSetting()` to access the shared test setting.

### Key Principles
1. **Create with `makeCurrent=false`** - Avoid changing the user's active setting
2. **Clean up properly** - Delete created objects to prevent data pollution
3. **Use real UUIDs** - Test with actual UUIDs from created objects
4. **Settings backup/restore is safe** - The functions handle unregistered settings gracefully
5. **One setting per directory** - Share the testSetting across all tests in a directory
6. **Wrap each file in describe** - Each test registration should be wrapped in its own describe block for proper grouping

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

❌ **Don't share testUtils across directories**
```typescript
// WRONG - Using the same testUtils in multiple directories
import { getTestSetting } from '../utils/testUtils'; // Don't do this!
```
Each test directory must have its own `testUtils.ts` file to avoid conflicts.

## What TO Do

✅ **Use shared test setting with testUtils pattern**
```typescript
// RIGHT - Create testUtils.ts for shared setting management
// testUtils.ts
export let testSetting: FCBSetting | undefined;
export const initializeTestSetting = async () => { /* ... */ };
export const cleanupTestSetting = async () => { /* ... */ };
export const getTestSetting = (): FCBSetting => { /* ... */ };

// index.ts - Batch-level setup
before(async () => {
  await initializeTestSetting();
});
after(async () => {
  await cleanupTestSetting();
  sinon.restore();
});

// Individual test files - use getTestSetting()
beforeEach(async () => {
  const testSetting = getTestSetting();
  testEntry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'Test' }))!;
});

it('should work', async () => {
  const testSetting = getTestSetting();
  // Test implementation
});
```

✅ **Test integration points**
```typescript
// RIGHT - Test how components work together
await filterRelatedEntries(testSetting, added, removed);
```

## File Organization
- Place tests in `test/unit/utils/` for utilities
- Place tests in `test/unit/classes/` for class tests
- Register tests in the appropriate `index.ts` file
- Use descriptive test names that explain what is being tested

### Setting up a New Test Directory

When creating a new test directory from scratch:

1. **Create the directory structure**:
   ```
   test/unit/[category]/
   ├── testUtils.ts      # Shared test utilities
   ├── index.ts          # Test registration entry point
   ├── some.test.ts      # Individual test files
   └── other.test.ts
   ```

2. **Create testUtils.ts** (copy from template above)

3. **Create index.ts** (copy from template above, update imports)

4. **Create test files** (follow the pattern in step 3)

5. **Register in main test runner**:
   ```typescript
   // In test/unit/index.ts or main test file
   import { register[Category]Tests } from './[category]/index';
   
   // Call the registration function
   register[Category]Tests();
   ```

## Remember
Quench runs INSIDE FoundryVTT, not alongside it. This means we have access to all FoundryVTT APIs and should use them rather than mocking them.
