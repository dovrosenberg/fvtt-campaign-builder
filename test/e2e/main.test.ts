import { test, expect, Page, BrowserContext } from '@playwright/test';
import { initializeWorld } from '@e2etest/utils';
import { createInitialSetting, createSettingFromSidebar } from '@e2etest/settings';
import { testData } from '@e2etest/data';

// Step functions are imported from separate files for organization

let context: BrowserContext;
let page: Page;

test.describe.serial('Setup', () => {
	test('Initialize world and login', async ({ browser }) => {
		context = await browser.newContext({
			viewport: { width: 1920, height: 1080 },
			ignoreHTTPSErrors: true,
		});

		page = await context.newPage();

		page.on('console', msg => {
			if (msg.type() === 'error') console.log(`Console error: ${msg.text()}`);
		});

		await initializeWorld(page, context);
		
		// Verify it worked
		await expect(page.locator('#fcb-launch')).toBeVisible();
	});

	test.describe.serial('Do basic setting tests', () => {
		test('Create a setting when none exists', async () => {
			await createInitialSetting(page);
		});
		
		// test('Create a second setting from menu', async () => {
			createSettingFromSidebar(page, testData.settings[1].name);
		// });

		test('Expand first setting', async () => {
			// confirm all there
		});

		test('Create a campaign in first setting', async () => {
			// create the campaign, make sure it's in campaign list
			// switch to another setting and make sure it's not there
		});
	});

	// see if
	// identify the priorities (data existing and saving and changing) and list the others but don't build for now
	// settings - change name; edit all the fields and make sure they stick (switch between settings to reload)
	// campaigns - create, add sessions, change name and check that it changes 
	// sessions - create; check renumbering; change name and check that it changes everywhere
	// entries - change name and check that it changes everywhere
	// ensure we can close and reopen the main window and that all the tabs are preserved
	// header - make sure bookmarks work, forward/back buttons, close tab controls
	// check the compendium folder structure and contents and that you
	//    can open each content type from there


	test.describe.serial('Blah', () => {
		test('Blah', async () => {
		});
	});

	test.afterAll(async () => {
		if (page) await page.close();
		if (context) await context.close();
	});
});
