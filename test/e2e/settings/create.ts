import test, { expect, Page } from '@playwright/test';
import { testData } from '@e2etest/data';
import { confirmSettingInList, fillOutNameDialog } from '@e2etest/utils';

export async function createInitialSetting(page: Page) {
  // the box should already be there
  await fillOutSettingNameDialog(page, testData.settings[0].name);

  await confirmSettingInList(page, testData.settings[0].name)
}

/** 
 * Creates a setting from the button on the sidebar
 */
export  function createSettingFromSidebar(page: Page, settingName: string) {
  test('testsc', async () => {
  const createSettingButton = page.locator('div.new-link:has-text("Create Setting")');
  await expect(createSettingButton).toBeVisible({ timeout: 5000 });
  await createSettingButton.click({ force: true });
  
  await fillOutSettingNameDialog(page, settingName);

  await confirmSettingInList(page, settingName);
  });
}

async function fillOutSettingNameDialog(page: Page, settingName: string) {
  await fillOutNameDialog(page, "Create Setting", settingName);
}

