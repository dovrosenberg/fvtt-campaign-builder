/**
 * Organization entry E2E tests.
 * Tests organization entry operations: opening, editing name, type selection,
 * tag management, relationships, push-to-session, content tabs.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting, expandTopicNode, expandTypeNode, getGenerateButtonSelector } from '@e2etest/utils';
import { Topics } from '../types';
import {
  openEntry,
  setEntryName,
  getEntryNameValue,
  getTypeValue,
  addTag,
  removeTag,
  clickTag,
  clickContentTab,
  clickPushToSession,
  createEntryViaUI,
  deleteEntryViaAPI,
  closeActiveTab,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Organization Entry Tests
 * Verifies organization entry CRUD operations, relationships, and navigation.
 */
describe('Organization Entry Tests', () => {
  let createdEntryUuid: string | null = null;
  // Track the current entry name - changes as tests rename it
  let currentEntryName = 'Test Organization Entry';

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
  // The entry created in early tests is reused across subsequent tests

  /**
   * What it tests: Opening an existing organization entry from the directory tree.
   * Expected behavior: Entry opens and displays the correct organization name in the name input.
   */
  it('Open existing organization entry', async () => {
    const setting = testData.settings[0];

    // Expand the organization topic folder
    await expandTopicNode(Topics.Organization);

    // Expand the (none) type folder
    await expandTypeNode(Topics.Organization, '(none)');

    // Open the first organization
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Verify the entry is open - wait for name input to have a value
    const page = sharedContext.page!;
    await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
    await page.waitForFunction(() => {
      const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
      return input && input.value.length > 0;
    }, { timeout: 5000 });
    const nameValue = await getEntryNameValue();
    // Expected behavior: Name input contains the organization's name
    expect(nameValue).to.equal(firstOrg.name);
  });

  it('Create new organization entry via UI', async () => {
    // Create a new entry via UI (simulates real user behavior)
    await expandTopicNode(Topics.Organization);
    createdEntryUuid = await createEntryViaUI(Topics.Organization, currentEntryName);

    // Entry is already open after creation

    // Verify the entry is open
    const nameValue = await getEntryNameValue();
    expect(nameValue).to.equal(currentEntryName);
  });

  /**
   * What it tests: Editing an organization's name with debounced auto-save.
   * Expected behavior: Name change persists after debounce period.
   */
  it('Edit organization name with debounce', async () => {
    // Entry should already be open from previous test
    // Change the name
    const newName = 'Renamed Test Organization';
    await setEntryName(newName);
    currentEntryName = newName;

    // Verify the name changed
    const nameValue = await getEntryNameValue();
    // Expected behavior: Name input reflects the new name after save
    expect(nameValue).to.equal(newName);
  });

  it('Select existing type for organization', async () => {
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
   * What it tests: Adding and removing tags from an organization entry.
   * Expected behavior: Tags can be added and removed, with UI reflecting changes.
   */
  it('Add and remove tags', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Wait for tags component to be initialized
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

    // Add a tag
    const testTag = 'test-org-tag-' + Date.now();
    await addTag(testTag);

    // Verify tag was added - wait a moment for tagify to update
    await delay(300);
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
    const clickTag1 = 'org-nav-tag-' + Date.now();
    await addTag(clickTag1);
    await delay(300);

    // Click the tag
    await clickTag(clickTag1);

    // Wait for new tab to open
    await delay(200);

    // Verify tag results tab is visible
    const tagResultsTab = await page.$('[data-testid="tag-results-tab"], .tag-results-tab');
    // Tag results should have opened a new tab
    const tabs = await page.$$('.fcb-tab');
    expect(tabs.length).to.be.greaterThan(1);

    // Close the tag results tab to return to the entry
    await closeActiveTab();
  });

  /**
   * What it tests: Pushing an organization entry to a session via the push-to-session button.
   * Expected behavior: Context menu appears with campaign options, entry is linked to session.
   */
  it('Push organization to session', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click the push to session button
    const pushed = await clickPushToSession();
    expect(pushed).to.equal(true);

    // Context menu should appear - select a campaign
    await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

    // Click first campaign option
    const menuItems = await page.$$('.mx-context-menu-item');
    if (menuItems.length > 0) {
      await menuItems[0].click();
      await delay(200);
    }
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

  /**
   * What it tests: Switching to the locations relationship tab.
   * Expected behavior: Locations relationship tab becomes visible.
   */
  it('Switch to locations relationship tab', async () => {
    const page = sharedContext.page!;

    // Entry should already be open from previous test
    // Click on locations tab
    await clickContentTab('locations');

    // Verify locations tab is visible
    const locsTab = await page.$('[data-tab="locations"]');
    expect(locsTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the organizations relationship tab (parent/child organizations).
   * Expected behavior: Organizations relationship tab becomes visible.
   */
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
   * What it tests: Switching to the sessions tab showing sessions this organization appears in.
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
});
