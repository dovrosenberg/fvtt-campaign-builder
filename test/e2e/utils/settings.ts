import { expect, Locator, } from 'playwright/test';
import { TestContext } from '../types';

export const switchToSetting = async (context: TestContext, settingName: string) => {
  const header = await confirmSettingInList(context, settingName);
  await header.click();
}

export const confirmSettingInList = async (context: TestContext, settingName: string): Promise<Locator> => {
  const page = context.page!;
  
  expect(page.locator('.fcb-setting-directory')).toBeVisible();  
  
  const settingHeader = page.locator('.fcb-setting-directory .folder-header').getByText(settingName);
  await expect(settingHeader).toBeVisible();

  return settingHeader;
}
