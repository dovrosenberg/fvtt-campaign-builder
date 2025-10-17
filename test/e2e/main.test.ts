// resets the world and then repopulates with the setup test data
// then runs all the tests

console.error("not sure how to do the config so it runs this stuff and then all the rests of the tests")
import { test, } from '@playwright/test';
import { initializeWorld, loginToWorld, openCampaignBuilder } from '@e2etest/utils';
import { sharedContext } from './sharedContext';
import { populateWorld } from './setup';

// Step functions are imported from separate files for organization

test.beforeAll(async ({ browser }) => {
	// setup browser
	sharedContext.context = await browser.newContext({
			viewport: { width: 1920, height: 1080 },
			ignoreHTTPSErrors: true,
		});

	sharedContext.page = await sharedContext.context.newPage();

	sharedContext.page.on('console', msg => {
		if (msg.type() === 'error') console.log(`Console error: ${msg.text()}`);
	});

	// login
	await loginToWorld();

	// reset the world
	await initializeWorld();

	// open the window
	await openCampaignBuilder();
});

test.describe.serial('Setup', () => {
	test('Rebuild the world', async () => {
		await populateWorld();
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
