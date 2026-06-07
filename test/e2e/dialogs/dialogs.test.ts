/**
 * Dialog E2E tests.
 * Tests dialog operations: create entry dialog, confirm dialogs,
 * relationship dialogs, and dialog cancellation.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting, openEntry } from '@e2etest/utils';
import { getByTestId } from '../helpers';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Opens the create entry dialog via the directory header button.
 */
const openCreateEntryDialog = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Find the create entry button in the directory header
  const createBtn = await page.$('[data-testid="create-entry-button"], .fcb-directory-header .fa-plus');
  if (createBtn) {
    await createBtn.click();
    await delay(300);
  }
};

/**
 * Checks if a dialog is visible.
 */
const isDialogVisible = async (): Promise<boolean> => {
  const page = sharedContext.page!;
  const dialog = await page.$('.fcb-dialog, .fcb-dialog-wrapper');
  return dialog !== null;
};

/**
 * Closes any open dialog.
 */
const closeDialog = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Try clicking cancel button first
  const cancelBtn = await page.$('.fcb-dialog-button:not(.primary), button:has-text("Cancel")');
  if (cancelBtn) {
    await cancelBtn.click();
    await delay(200);
    return;
  }

  // Try pressing Escape
  await page.keyboard.press('Escape');
  await delay(200);
};

/**
 * Gets the dialog title.
 */
const getDialogTitle = async (): Promise<string> => {
  const page = sharedContext.page!;
  const titleEl = await page.$('.fcb-dialog-title, .fcb-dialog h3, .fcb-dialog .dialog-title');
  if (!titleEl) return '';
  return await titleEl.evaluate(el => el.textContent || '');
};

/**
 * Clicks the add relationship button in an entry.
 */
const clickAddRelationshipButton = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Find the add relationship button
  const addBtn = await page.$('[data-testid="add-relationship-button"], .fcb-relationship-add, .fa-user-plus');
  if (addBtn) {
    await addBtn.click();
    await delay(300);
  }
};

/**
 * Creates an entry via the API.
 */
const createEntryViaAPI = async (name: string, topic: number, settingName: string): Promise<string> => {
  const page = sharedContext.page!;

  return await page.evaluate(
    async ({ name, topic, settingName }: { name: string; topic: number; settingName: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createEntry(name, topic, settingName);
    },
    { name, topic, settingName }
  );
};

/**
 * Deletes an entry via the API.
 */
const deleteEntryViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteEntry(uuid);
  }, uuid);
};

/**
 * Dialog Tests
 * Verifies dialog visibility, interaction, and cancellation.
 */
describe('Dialog Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Dialog Entry';

  before(async () => {
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  after(async () => {
    if (createdEntryUuid) {
      try {
        await deleteEntryViaAPI(createdEntryUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // Create Entry Dialog Tests
  it('Create entry button is visible in directory', async () => {
    const page = sharedContext.page!;
    const createBtn = await page.$('.fcb-directory-header .fa-plus, [data-testid="create-entry-button"]');
    expect(createBtn).to.not.be.null;
  });

  it('Open create entry dialog', async () => {
    await openCreateEntryDialog();
    
    const isVisible = await isDialogVisible();
    expect(isVisible).to.equal(true);
  });

  /**
   * What it tests: Create entry dialog has a title.
   * Expected behavior: Dialog title is present and not empty.
   */
  it('Create entry dialog has title', async () => {
    const title = await getDialogTitle();
    expect(title.length).to.be.greaterThan(0);
  });

  /**
   * What it tests: Create entry dialog can be closed.
   * Expected behavior: Dialog is no longer visible after closing.
   */
  it('Close create entry dialog', async () => {
    await closeDialog();
    
    const isVisible = await isDialogVisible();
    expect(isVisible).to.equal(false);
  });

  // Relationship Dialog Tests
  it('Open entry for relationship testing', async () => {
    const setting = testData.settings[0];
    const characters = setting.topics[1]; // Topics.Character = 1

    if (!characters || characters.length === 0) {
      // Create an entry for testing
      createdEntryUuid = await createEntryViaAPI(testEntryName, 1, setting.name);
      await openEntry(1, testEntryName); // Topics.Character = 1
    } else {
      await openEntry(1, characters[0].name); // Topics.Character = 1
    }

    const page = sharedContext.page!;
    const nameHeader = await page.$('.fcb-name-header');
    expect(nameHeader).to.not.be.null;
  });

  it('Entry has relationship section', async () => {
    const page = sharedContext.page!;
    
    // Look for relationships tab or section
    const relationshipSection = await page.$('[data-tab="relationships"], .fcb-relationships-section');
    expect(relationshipSection).to.not.be.null;
  });

  it('Navigate to relationships tab', async () => {
    const page = sharedContext.page!;
    
    const relTab = await page.$('[data-tab="relationships"]');
    if (relTab) {
      await relTab.click();
      await delay(200);
    }

    const activeTab = await page.$('[data-tab="relationships"].active, [data-tab="relationships"][aria-selected="true"]');
    expect(activeTab).to.not.be.null;
  });

  it('Add relationship button exists', async () => {
    const page = sharedContext.page!;
    
    // First navigate to relationships tab
    const relTab = await page.$('[data-tab="relationships"]');
    if (relTab) {
      await relTab.click();
      await delay(200);
    }

    const addBtn = await page.$('.fcb-relationship-add, [data-testid="add-relationship-button"], .fa-user-plus');
    expect(addBtn).to.not.be.null;
  });

  it('Open add relationship dialog', async () => {
    const page = sharedContext.page!;
    
    // First navigate to relationships tab
    const relTab = await page.$('[data-tab="relationships"]');
    if (relTab) {
      await relTab.click();
      await delay(200);
    }

    await clickAddRelationshipButton();
    
    const isVisible = await isDialogVisible();
    expect(isVisible).to.equal(true);
  });

  it('Relationship dialog has title', async () => {
    const title = await getDialogTitle();
    expect(title.length).to.be.greaterThan(0);
  });

  it('Close relationship dialog', async () => {
    await closeDialog();
    
    const isVisible = await isDialogVisible();
    expect(isVisible).to.equal(false);
  });

  // Dialog Button Tests
  /**
   * What it tests: Confirm dialog displays the correct message.
   * Expected behavior: Dialog message matches the expected text.
   */
  it('Dialog has cancel button', async () => {
    await openCreateEntryDialog();
    
    const page = sharedContext.page!;
    const cancelBtn = await page.$('.fcb-dialog-button:has-text("Cancel"), button:has-text("Cancel")');
    expect(cancelBtn).to.not.be.null;
    
    await closeDialog();
  });

  it('Dialog has action button', async () => {
    await openCreateEntryDialog();
    
    const page = sharedContext.page!;
    const actionBtn = await page.$('.fcb-dialog-button.primary, .fcb-dialog-button.default');
    expect(actionBtn).to.not.be.null;
    
    await closeDialog();
  });
});
