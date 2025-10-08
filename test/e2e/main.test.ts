import { test, expect } from './fixtures';

//Test basic DsN stuff
test.describe.serial('Testing main dsn features', () => {
	test('Module popped up a dialog to create a setting', async ({ fcbPage }) => {
		// look for an h4 element containing "Create Setting"
		await fcbPage.waitForSelector('h4:has-text("Create Setting")');
	});
});