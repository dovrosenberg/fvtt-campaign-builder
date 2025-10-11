import { Page, expect } from '@playwright/test';
import { TestContext } from '../types';

export async function deleteSetting(context: TestContext, settingName: string) {
  const page = context.page!;
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
