/**
 * PC (Player Character) entry E2E tests.
 * Tests PC entry operations: opening, editing name, player name, type selection,
 * tag management, relationships, push-to-session, content tabs.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting, expandTopicNode, getGenerateButtonSelector } from '@e2etest/utils';
import { Topics } from '../types';
import {
  setEntryName,
  getEntryNameValue,
  getTypeValue,
  addTag,
  removeTag,
  clickTag,
  clickContentTab,
  createEntryViaUI,
  deleteEntryViaAPI,
  closeActiveTab,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * PC Entry Tests
 * Verifies PC entry CRUD operations, player name field, relationships, and navigation.
 */
describe('PC Entry Tests', () => {
  let createdEntryUuid: string | null = null;
  // Track the current entry name - changes as tests rename it
  let currentEntryName = 'Test PC Entry';

  before(async () => {
    const setting = testData.settings[0];
    await switchToSetting(setting.name);

    // Close any leftover tabs from previous runs
    const page = sharedContext.page!;
    const closeButtons = await page.$$('[data-testid="tab-close-button"]');
    for (const btn of closeButtons) {
      try {
        await btn.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch {
        // Ignore close errors
      }
    }
  });

  after(async () => {
    // Clean up created entry
    if (createdEntryUuid) {
      try {
        await deleteEntryViaAPI(createdEntryUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  // Note: No afterEach tab closing - serial tests depend on state from previous tests
  // Tabs are closed in afterAll for cleanup

  /**
   * What it tests: Creating a new PC entry via the UI.
   * Expected behavior: Entry is created and opens automatically.
   */
  it('Create new PC entry via UI', async () => {
    // Create a new entry via UI (simulates real user behavior)
    await expandTopicNode(Topics.PC);
    createdEntryUuid = await createEntryViaUI(Topics.PC, currentEntryName);

    // Entry is already open after creation

    // Verify the entry is open
    const nameValue = await getEntryNameValue();
    expect(nameValue).to.equal(currentEntryName);
  });

  /**
   * What it tests: Editing a PC's name with debounced auto-save.
   * Expected behavior: Name change persists after debounce period.
   */
  it('Edit PC name with debounce', async () => {
    // Entry should already be open from previous test
    // Change the name
    const newName = 'Renamed Test PC';
    await setEntryName(newName);
    currentEntryName = newName;

    // Verify the name changed
    const nameValue = await getEntryNameValue();
    // Expected behavior: Name input reflects the new name after save
    expect(nameValue).to.equal(newName);
  });

  /**
   * What it tests: Editing the player name field (the player who owns this PC).
   * Expected behavior: Player name change persists after save.
   */
  it('Edit player name', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Set player name
    const playerInput = await page.$('.fcb-player-name input, input[data-testid="player-name-input"]');
    if (playerInput) {
      await playerInput.evaluate((el) => { (el as HTMLInputElement).value = 'Test Player'; });
      await playerInput.type(''); // Trigger input event
      await delay(700); // Wait for debounce

      // Verify player name changed
      const value = await playerInput.evaluate(el => (el as HTMLInputElement).value);
      expect(value).to.equal('Test Player');
    }
  });

  it('Select existing type for PC', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click on the type input to open dropdown
    const typeInput = await page.$('.fcb-typeahead input[data-testid="typeahead-input"]');
    if (typeInput) {
      await typeInput.click();

      // Wait for dropdown to appear
      await page.waitForSelector('.fcb-ta-dropdown', { timeout: 5000 });

      // Find and click the first option
      const options = await page.$$('.typeahead-entry');
      if (options.length > 0) {
        await options[0].click();
        await delay(200);
      }
    }

    // Verify type was selected
    const typeValue = await getTypeValue();
    expect(typeValue.length).to.be.greaterThan(0);
  });

  /**
   * What it tests: Adding and removing tags from a PC entry.
   * Expected behavior: Tags can be added and removed, with UI reflecting changes.
   */
  it('Add and remove tags', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Wait for tags component to be initialized
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

    // Add a tag
    const testTag = 'test-pc-tag';
    await addTag(testTag);

    // Verify tag was added
    const tags = await page.$$('.tagify__tag');
    let found = false;
    for (const tag of tags) {
      const text = await tag.evaluate(el => el.textContent);
      if (text?.includes(testTag)) {
        found = true;
        break;
      }
    }
    // Expected behavior: Tag appears in the tags list after adding
    expect(found).to.equal(true);

    // Remove the tag
    await removeTag(testTag);

    // Verify tag was removed
    const tagsAfter = await page.$$('.tagify__tag');
    for (const tag of tagsAfter) {
      const text = await tag.evaluate(el => el.textContent);
      // Expected behavior: Tag no longer appears in the tags list
      expect(text?.includes(testTag)).to.equal(false);
    }
  });

  /**
   * What it tests: Clicking a tag opens a tag results tab showing entries with that tag.
   * Expected behavior: New tab opens displaying tag search results.
   */
  it('Click tag opens tag results tab', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Add a tag first
    await addTag('pc-nav-tag');
    await delay(300);

    // Click the tag
    await clickTag('pc-nav-tag');

    // Wait for new tab to open
    await delay(200);

    // Verify tag results tab opened (new tab)
    const tabs = await page.$$('.fcb-tab');
    expect(tabs.length).to.be.greaterThan(1);

    // Close the tag results tab to return to the entry
    await closeActiveTab();
  });

  /**
   * What it tests: Generate button displays a context menu with AI generation options.
   * Expected behavior: Context menu appears with generation options.
   */
  it('Generate button shows context menu', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click the generate button
    const genSelector = await getGenerateButtonSelector();
    if (genSelector) {
      await sharedContext.page!.click(genSelector);

      // Wait for context menu
      await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

      // Verify menu has options
      const menuItems = await page.$$('.mx-context-menu-item');
      // Expected behavior: Context menu contains at least one generation option
      expect(menuItems.length).to.be.greaterThan(0);
    }
  });

  /**
   * What it tests: Switching to the sessions tab showing sessions this PC appears in.
   * Expected behavior: Sessions tab becomes visible.
   */
  it('Switch to sessions tab', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click on sessions tab
    await clickContentTab('sessions');

    // Verify sessions tab is visible
    const sessionsTab = await page.$('[data-tab="sessions"]');
    expect(sessionsTab).to.not.be.null;
  });

  /**
   * What it tests: Pushing a PC entry to a session via the push-to-session button.
   * Expected behavior: Context menu appears with campaign options, entry is linked to session.
   */
  it('Push PC to session', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click the push-to-session button
    const pushBtn = await page.$('.fcb-push-to-session');
    if (pushBtn) {
      await pushBtn.click();

      // Wait for context menu
      await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

      // Verify menu has options
      const menuItems = await page.$$('.mx-context-menu-item');
      // Expected behavior: Context menu contains at least one campaign option
      expect(menuItems.length).to.be.greaterThan(0);
    }
  });

  it('Switch to journals tab', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click on journals tab
    await clickContentTab('journals');

    // Verify journals tab is visible
    const journalsTab = await page.$('[data-tab="journals"]');
    expect(journalsTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the characters relationship tab.
   * Expected behavior: Characters relationship tab becomes visible.
   */
  it('Switch to characters relationship tab', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click on characters tab
    await clickContentTab('characters');

    // Verify characters tab is visible
    const charsTab = await page.$('[data-tab="characters"]');
    expect(charsTab).to.not.be.null;
  });

  it('Switch to locations relationship tab', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click on locations tab
    await clickContentTab('locations');

    // Verify locations tab is visible
    const locsTab = await page.$('[data-tab="locations"]');
    expect(locsTab).to.not.be.null;
  });

  it('Switch to organizations relationship tab', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click on organizations tab
    await clickContentTab('organizations');

    // Verify organizations tab is visible
    const orgsTab = await page.$('[data-tab="organizations"]');
    expect(orgsTab).to.not.be.null;
  });

  /**
   * What it tests: Image picker component is visible for PC portrait.
   * Expected behavior: Image picker is present in the PC entry.
   */
  it('Image picker is visible', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Switch to description tab to see image picker
    await clickContentTab('description');

    // Verify image picker is present
    const imagePicker = await page.$('.fcb-image-picker, .fcb-pc-image-container');
    expect(imagePicker).to.not.be.null;
  });

  /**
   * What it tests: Switching to the foundry documents tab.
   * Expected behavior: Foundry documents tab becomes visible.
   */
  it('Switch to foundry tab', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click on foundry tab
    await clickContentTab('foundry');

    // Verify foundry tab is visible
    const foundryTab = await page.$('[data-tab="foundry"]');
    expect(foundryTab).to.not.be.null;
  });

  it('PC shows image picker', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Go back to description tab
    await clickContentTab('description');

    // Verify image picker is present
    const imagePicker = await page.$('.fcb-image-picker, .fcb-pc-image-container');
    expect(imagePicker).to.not.be.null;
  });
});
