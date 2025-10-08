import { test, expect } from '../fixtures';

let settingName = `E2E Setting ${Date.now()}`;

// Creates a new setting via Home Page action, then deletes it via the directory context menu
// Assumes FVTT is available at http://localhost:30000 and Campaign Builder is installed and enabled

test.describe.serial('Create and delete a Setting', () => {
  test.describe.serial('Setting operations', () => {
    test('create a new setting and delete it', async ({ fcbPage }) => {
      // Wait for Campaign Builder UI to be visible
      await fcbPage.waitForSelector('#fcb-directory', { state: 'visible' });

      // If a first-time "Create Setting" dialog is shown (as in main.test), dismiss it by clicking outside
      // We proceed to use the Home Page action to create a setting to ensure a deterministic flow

      // Open Home Page (setting content tab is typically active by default)
      // Click the Home Page "Create Setting" tile
      // The Home Page action is a div with class new-link and text "Create Setting"
      const createSettingTile = fcbPage.locator('div.new-link:has-text("Create Setting")');
      await expect(createSettingTile).toBeVisible({ timeout: 10000 });
      await createSettingTile.click({ force: true });

      // A prompt dialog appears asking for the setting name
      // Foundry Dialog renders with .dialog and inputs; enter our unique name and confirm
      // Try common selectors for the single text input
      const nameInput = fcbPage.locator('.dialog input[type="text"], .dialog input');
      await expect(nameInput).toBeVisible();
      await nameInput.fill(settingName);

      // Click the primary/yes/ok button on the dialog
      // Buttons could be labeled OK, Yes, Create, or localized. Prefer the first button with role/button inside dialog footer.
      const confirmButton = fcbPage.locator('.dialog .dialog-buttons button, .dialog .footer button').first();
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();

      // Wait for the new setting to appear as the active setting folder header
      const settingHeader = fcbPage.locator('.fcb-setting-folder:not(.collapsed) > .folder-header');
      await expect(settingHeader).toContainText(settingName, { timeout: 15000 });

      // Right-click the active setting header to open context menu
      await settingHeader.click({ button: 'right' });

      // Click the Delete action in the context menu
      // The menu uses @imengyu/vue3-context-menu with customClass 'fcb'; match by text contains 'Delete'
      const deleteMenuItem = fcbPage.locator('.v-contextmenu, .fcb >> text=/Delete/i');
      await expect(deleteMenuItem).toBeVisible();
      await deleteMenuItem.click({ force: true });

      // Confirm deletion in the confirmation dialog
      const confirmDeleteTitle = fcbPage.locator('.dialog:has-text("Delete setting?")');
      await expect(confirmDeleteTitle).toBeVisible();

      const confirmDeleteBtn = fcbPage.locator('.dialog .dialog-buttons button, .dialog .footer button').first();
      await expect(confirmDeleteBtn).toBeVisible();
      await confirmDeleteBtn.click();

      // After deletion, the active setting header should no longer contain our setting name
      await expect(settingHeader).not.toContainText(settingName, { timeout: 15000 });
    });
  });
});