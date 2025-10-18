import { test, expect, Page } from '@playwright/test';
import { testData } from '@e2etest/data';
import { confirmSettingInList, fillOutNameDialog } from '@e2etest/utils';
import { TestContext } from '../types';

export const createInitialSetting = (context: TestContext) => {
  test('Create a setting when none exists', async () => {
    // the box should already be there
    await fillOutSettingNameDialog(context, testData.settings[0].name);

    await confirmSettingInList(context, testData.settings[0].name)
  });
}

/** 
 * Creates a setting from the button on the sidebar
 */
export const createSettingFromSidebar = (context: TestContext, settingName: string) => {
  test('Create a setting from the button on the sidebar', async () => {
    const page = context.page!;

    const createSettingButton = page.locator('div.new-link:has-text("Create Setting")');
    await expect(createSettingButton).toBeAttached();
    await createSettingButton.click({ force: true });
    
    await fillOutSettingNameDialog(context, settingName);

    const folderHeader = page
    .locator('.fcb-setting-directory .fcb-setting-folder > .folder-header')
    .filter({ hasText: settingName });
  
    console.log(await folderHeader.count());
    await expect(folderHeader).toHaveCount(1); // this forces the DOM to settle

    await confirmSettingInList(context, settingName);
  });
}

async function fillOutSettingNameDialog(context: TestContext, settingName: string) {
  await fillOutNameDialog(context, "Create Setting", settingName);
}

