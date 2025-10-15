import { test, expect } from '@playwright/test';
import { sharedContext } from './setup.test';
import { populateTestData } from '@e2etest/utils';

test.describe.serial('Data Setup', () => {
	test('Populate test data', async () => {
		// Ensure we have a page from setup
		expect(sharedContext.page).toBeDefined();
		
		// Populate the data
		await populateTestData(sharedContext);
		
		// Verify FCB is still visible after setup
		await expect(sharedContext.page!.locator('#fcb-launch')).toBeVisible();
	});
});
