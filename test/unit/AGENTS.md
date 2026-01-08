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

### Setup Pattern
```typescript
export const registerSomeTests = () => {
  let testSetting: FCBSetting;
  
  // Batch-level setup - create once for all tests
  before(async () => {
    // Backup module settings if needed
    await backupSettings();
    
    // Create the test setting once
    testSetting = (await FCBSetting.create(false, 'Test Setting'))!;
  });
  
  // Batch-level cleanup - delete once after all tests
  after(async () => {
    if (testSetting) {
      await testSetting.delete();
    }
    
    // Restore module settings if backed up
    await restoreSettings();
  });

  describe('some feature', () => {
    let testEntries: Entry[];
    
    beforeEach(async () => {
      // Create test data within the existing setting
      testEntries = [
        (await Entry.create(testSetting.topicFolders[Topics.Character]!, {
          name: 'Test Character 1'
        }))!,
        // ...
      ];
    });
    
    // Tests use testSetting and testEntries
    it('should work correctly', async () => {
      // Test implementation
    });
  });
};
```

### Key Principles
1. **Create with `makeCurrent=false`** - Avoid changing the user's active setting
2. **Clean up properly** - Delete created objects to prevent data pollution
3. **Use real UUIDs** - Test with actual UUIDs from created objects
4. **Settings backup/restore is safe** - The functions handle unregistered settings gracefully

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

await filterRelatedEntries(testSetting, added, removed);

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

❌ **Don't use mock objects for FCB classes**
```typescript
// WRONG - complex getters/setters cause issues
const mockSetting = sinon.createStubInstance(FCBSetting);
```

## What TO Do

✅ **Use real objects with batch-level setup**
```typescript
// RIGHT - Create setting once for all tests
let testSetting: FCBSetting;

before(async () => {
  testSetting = (await FCBSetting.create(false, 'Test'))!;
});

after(async () => {
  if (testSetting) await testSetting.delete();
});

// Individual tests create their own data within this setting
beforeEach(async () => {
  testEntry = (await Entry.create(testSetting.topicFolders[Topics.Character]!, { name: 'Test' }))!;
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

## Remember
Quench runs INSIDE FoundryVTT, not alongside it. This means we have access to all FoundryVTT APIs and should use them rather than mocking them.
