// resets the world and then repopulates with the setup test data

import { test } from '@playwright/test';
import { sharedContext } from './sharedContext';
import { populateSetting } from './setup';
import { testData } from './data';
import { ensureSetup } from './ensureSetup';

// Step functions are imported from separate files for organization

test.beforeAll(async ({ browser }) => {
	test.setTimeout(90000);  // the initialization of everything could take a while

	// Ensure setup is done (will only run once per test session)
	await ensureSetup(browser, true);
});

test.describe.serial('Setup', () => {
	test('Populate Settings', async () => {
		test.slow();
		await populateSetting(testData.settings[0]);
		await populateSetting(testData.settings[1]);
	});

	// runCampaignTests(page);

	// identify the priorities (data existing and saving and changing) and list the others but don't build for now
	// settings - change name; edit all the fields and make sure they stick (switch between settings to reload)
	// campaigns - create, add sessions, change name and check that it changes 
	// sessions - create; check renumbering; change name and check that it changes everywhere
	// entries - change name and check that it changes everywhere
	// ensure we can close and reopen the main window and that all the tabs are preserved
	// header - make sure bookmarks work, forward/back buttons, close tab controls
	// check the compendium folder structure and contents and that you
	//    can open each content type from there


	test.afterAll(async () => {
		if (sharedContext.page) await sharedContext.page.close();
		if (sharedContext.context) await sharedContext.context.close();
	});
});
