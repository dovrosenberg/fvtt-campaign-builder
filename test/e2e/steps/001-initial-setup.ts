import { Page, expect } from '@playwright/test';

/**
 * Step 1: Verify initial dialog appears
 */
export async function createInitialSetting(page: Page) {
  await page.waitForSelector('h4:has-text("Create Setting")');
}

/**
 * Step 2: Create a new setting via Home Page
 */
export async function createSetting(page: Page, settingName: string) {
  await page.waitForSelector('#fcb-directory', { state: 'visible' });
  
  const createSettingTile = page.locator('div.new-link:has-text("Create Setting")');
  await expect(createSettingTile).toBeVisible({ timeout: 10000 });
  await createSettingTile.click({ force: true });
  
  const nameInput = page.locator('.dialog input[type="text"], .dialog input');
  await expect(nameInput).toBeVisible();
  await nameInput.fill(settingName);
  
  const confirmButton = page.locator('.dialog .dialog-buttons button, .dialog .footer button').first();
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  
  const settingHeader = page.locator('.fcb-setting-folder:not(.collapsed) > .folder-header');
  await expect(settingHeader).toContainText(settingName, { timeout: 15000 });
}

/**
 * Step 3: Delete the active setting
 */
export async function deleteSetting(page: Page) {
  const settingHeader = page.locator('.fcb-setting-folder:not(.collapsed) > .folder-header');
  
  await settingHeader.click({ button: 'right' });
  
  const deleteMenuItem = page.locator('.v-contextmenu, .fcb >> text=/Delete/i');
  await expect(deleteMenuItem).toBeVisible();
  await deleteMenuItem.click({ force: true });
  
  const confirmDeleteTitle = page.locator('.dialog:has-text("Delete setting?")');
  await expect(confirmDeleteTitle).toBeVisible();
  
  const confirmDeleteBtn = page.locator('.dialog .dialog-buttons button, .dialog .footer button').first();
  await expect(confirmDeleteBtn).toBeVisible();
  await confirmDeleteBtn.click();
  
  await expect(settingHeader).not.toContainText('E2E Setting', { timeout: 15000 });
}
