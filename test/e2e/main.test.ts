import { test, expect, Page, BrowserContext } from '@playwright/test';
import { initializeWorld } from './auth';
import { createInitialSetting,  } from './steps/001-initial-setup';

// Step functions are imported from separate files for organization

let context: BrowserContext;
let page: Page;

test.describe.serial('Setup', () => {
	test('Initialize world and login', async ({ browser }) => {
		console.log('Creating browser context...');
		context = await browser.newContext({
			viewport: { width: 1920, height: 1080 },
			ignoreHTTPSErrors: true,
		});

		console.log('Creating new page...');
		page = await context.newPage();

		page.on('console', msg => {
			if (msg.type() === 'error') console.log(`Console error: ${msg.text()}`);
		});

		console.log('Initializing world...');
		await initializeWorld(page, context);
		
		// Verify it worked
		await expect(page.locator('#fcb-launch')).toBeVisible();
	});

	test('Create a setting when none exists', async ({ }) => {
		await createInitialSetting(page);
	});
	
	test.afterAll(async () => {
		if (page) await page.close();
		if (context) await context.close();
	});
});
