import { expect, Locator, } from 'playwright/test';
import { sharedContext } from '../sharedContext';

export const switchToSetting = async (settingName: string) => {
  const page = sharedContext.page!;

  await page.getByTestId('setting-select').click();
  await page.locator('.p-select-option-label')
    .filter({hasText: settingName})
    .click();

  await expect(page.getByTestId(`setting-folder-${settingName}`)).toBeVisible();
}

export const confirmSettingInList = async (settingName: string): Promise<Locator> => {
  const page = sharedContext.page!;

  await page.getByTestId('setting-select').click();
  await page.locator('.p-select-option-label')
    .filter({hasText: settingName})
    .click();

  // return the locator for the folder header
  const folderHeader = page.getByTestId(`setting-folder-${settingName}`);
  await expect(folderHeader).toBeVisible();

  return folderHeader;
}