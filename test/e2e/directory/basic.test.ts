import { expect, test } from '@playwright/test';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { ensureSetup } from '../ensureSetup';

test.describe.serial('Basic Directory functions', () => {
	test.beforeAll(async ({ browser }) => {
		// Ensure setup is done (will only run once per test session)
		await ensureSetup(browser);
		
		const page = sharedContext.page!;
		const setting = testData.settings[0];

		// pick the right setting
		await page.getByTestId('setting-select').click();
		await page.locator(`.p-select-option-label[has-text="${setting.name}"]`).click();

		await expect(page.getByTestId(`setting-folder-${setting.name}`)).toBeVisible();

		// close the tabs?
	});

	test('Expand entry folders', async () => {
		const page = sharedContext.page!;

		// make sure everything closed to start, just in case
		await page.getByTestId('collapse-all-button').click();

		// make sure the 1st location isn't visible
		await expect(page.locator(`.fcb-directory-entry[has-text="${testData.settings[0]}"]`))
			.toHaveCount(0);

		// open each folder and make sure the 1st node is visible

		// also check collapse all
	});

	test('Expand campaign folders', async () => {
		// also check collapse all
	});

	test('Open a setting', async () => {
	});

	test('Open a character', async () => {
	});

	test('Open a location', async () => {
	});

	test('Open a organization', async () => {
	});

	test('Open a PC', async () => {
	});

	test('Open a campaign', async () => {
	});

	test('Open a session', async () => {
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
