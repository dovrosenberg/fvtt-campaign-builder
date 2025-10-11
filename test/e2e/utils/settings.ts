import { expect, Locator, } from 'playwright/test';
import { TestContext } from '../types';

export const switchToSetting = async (context: TestContext, settingName: string) => {
  const header = await confirmSettingInList(context, settingName);
  await header.click();
}

export const confirmSettingInList = async (context: TestContext, settingName: string): Promise<Locator> => {
  const page = context.page!;
  
  expect(page.locator('.fcb-setting-directory')).toBeVisible();  
    
  const folderHeader = page
    .locator('.fcb-setting-directory .fcb-setting-folder > .folder-header')
    .filter({ hasText: settingName });
  
  await expect(folderHeader).toHaveCount(1); // this forces the DOM to settle
  await expect(folderHeader).toBeVisible();

  return folderHeader;
}

export const openSettingContent = async (context: TestContext, settingName: string) => {
  await switchToSetting(context, settingName);

  // click on the setting name
  // await header.click();
}