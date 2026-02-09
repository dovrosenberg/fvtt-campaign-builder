# Test Steps for StoryWeb Panel Split Fix

## Setup
1. Open Campaign Builder
2. Create/open a story web in Panel 0 (make it active)

## Test Scenario
1. In Panel 1, open multiple tabs:
   - Open a story web (but don't make it active)
   - Open another entry and make it active
2. Split Panel 1 (click the split button)
3. Verify that only one story web remains active:
   - The story web in Panel 0 should still be active
   - The story web tab that remained in Panel 1 should NOT be active
   - The moved tab in the new Panel 2 should be active (and not a story web)

## Expected Behavior
- Only one story web should be active across all panels
- The story web exclusivity rule should be maintained when splitting panels

## What the Fix Does
- Uses `activateTab()` instead of directly setting `active = true`
- This ensures the story web exclusivity logic runs when a new tab becomes active
- If the newly activated tab in the source panel is a story web, it will close other active story webs
