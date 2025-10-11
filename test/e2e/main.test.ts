import { test, expect, Page, BrowserContext } from '@playwright/test';
import { initializeWorld } from '@e2etest/utils';
import { runSettingsTests } from '@e2etest/settings';
import { testData } from '@e2etest/data';

// Step functions are imported from separate files for organization

let masterContext: {
	page?: Page,
	context?: BrowserContext
} = {}

test.describe.serial('Setup', () => {
	test('Initialize world and login', async ({ browser }) => {
		masterContext.context = await browser.newContext({
			viewport: { width: 1920, height: 1080 },
			ignoreHTTPSErrors: true,
		});

		masterContext.page = await masterContext.context.newPage();

		masterContext.page.on('console', msg => {
			if (msg.type() === 'error') console.log(`Console error: ${msg.text()}`);
		});

		await initializeWorld(masterContext);
		
		// Verify it worked
		await expect(masterContext.page.locator('#fcb-launch')).toBeVisible();
	});

	runSettingsTests(masterContext);

	// runCampaignTests(page);

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
		if (masterContext.page) await masterContext.page.close();
		if (masterContext.context) await masterContext.context.close();
	});
});
