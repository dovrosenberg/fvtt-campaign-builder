import { expect, Page } from 'playwright/test';

export async function switchToSetting(page: Page, settingName: string) {
  expect(page.locator('.fcb-setting-directory')).toBeVisible();  

  const settingHeader = page.locator(`.fcb-setting-folder .folder-header div i:has-text("${settingName}")`);
  await settingHeader.click();
}

export async function confirmSettingInList(page: Page, settingName: string) {
  await page.waitForSelector('.fcb-setting-directory', { state: 'visible' });
  
  const settingHeader = page.locator(`.fcb-setting-folder .folder-header div i:has-text("${settingName}")`);
  await expect(settingHeader).toBeVisible();
}
