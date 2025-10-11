import { expect, Page } from 'playwright/test';
import { TestContext } from '../types';

export async function switchToSetting(context: TestContext, settingName: string) {
  const page = context.page!;

  expect(page.locator('.fcb-setting-directory')).toBeVisible();  

  const settingHeader = page.locator(`.fcb-setting-folder .folder-header div i:has-text("${settingName}")`);
  await settingHeader.click();
}

export async function confirmSettingInList(context: TestContext, settingName: string) {
  const page = context.page!;
  
  expect(page.locator('.fcb-setting-directory')).toBeVisible();  
  
  // const settingHeader = page.locator(`.fcb-setting-folder .folder-header div i:has-text("${settingName}")`);
  const settingHeader = page.locator(`.fcb-setting-folder .folder-header div i`);
  await expect(`x${await settingHeader.innerHTML()}x`).toBe(`x${settingName}x`);
  await expect(settingHeader).toBeVisible();
}
