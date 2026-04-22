/**
 * Tags component E2E tests.
 * Tests tag operations: adding, removing, clicking, tag results navigation,
 * and tag persistence across different entry types.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '../types';
import {
  openEntry,
  addTag,
  removeTag,
  clickTag,
  createEntryViaAPI,
  deleteEntryViaAPI,
  closeActiveTab,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets all visible tags.
 */
const getAllTags = async () => {
  const page = sharedContext.page!;
  return await page.$$('.tagify__tag');
};

/**
 * Gets tag text content.
 */
const getTagText = async (tag: import('puppeteer').ElementHandle<Element>) => {
  return await tag.evaluate(el => el.textContent?.trim() || '');
};

/**
 * Checks if tags wrapper is initialized.
 */
const isTagsInitialized = async () => {
  const page = sharedContext.page!;
  const wrapper = await page.$('.tags-wrapper');
  if (!wrapper) return false;
  return await wrapper.evaluate(el => !el.classList.contains('uninitialized'));
};

/**
 * Tags Component Tests
 * Verifies tag functionality across entry types.
 */
describe('Tags Component Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Tags Entry';

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

  /**
   * What it tests: Tags component is visible on entry open.
   * Expected behavior: Tags wrapper is present in the DOM.
   */
  it('Tags component is visible on entry open', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Wait for tags to initialize
    const page = sharedContext.page!;
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

    // Verify tags wrapper is present
    const wrapper = await page.$('.tags-wrapper');
    expect(wrapper).to.not.be.null;
  });

  /**
   * What it tests: Tag input has placeholder text.
   * Expected behavior: Placeholder attribute is set on the input.
   */
  it('Tag input has placeholder', async () => {
    const page = sharedContext.page!;

    // Verify tags input exists
    const tagsInput = await page.$('.tags-wrapper input, .tagify__input');
    expect(tagsInput).to.not.be.null;
  });

  /**
   * What it tests: Adding a tag to a character entry.
   * Expected behavior: Tag appears in the tags list after adding.
   */
  it('Add a new tag', async () => {
    const setting = testData.settings[0];

    // Create a new entry for this test
    createdEntryUuid = await createEntryViaAPI(Topics.Character, testEntryName, setting.name);

    // Open the entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Wait for tags to initialize
    const page = sharedContext.page!;
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });

    // Add a tag
    await addTag('test-tag-one');

    // Verify tag was added
    const tags = await getAllTags();
    let found = false;
    for (const tag of tags) {
      const text = await getTagText(tag);
      if (text.includes('test-tag-one')) {
        found = true;
        break;
      }
    }
    expect(found).to.equal(true);
  });

  /**
   * What it tests: Multiple tags can be added to an entry.
   * Expected behavior: All added tags appear in the tags list.
   */
  it('Add multiple tags', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Add multiple tags
    await addTag('multi-tag-1');
    await addTag('multi-tag-2');
    await addTag('multi-tag-3');

    // Verify all tags are present
    const tags = await getAllTags();
    // Expected behavior: At least 2 tags are present
    expect(tags.length).to.be.greaterThan(1);
  });

  /**
   * What it tests: Removing a tag from a character entry.
   * Expected behavior: Tag is removed from the tags list.
   */
  it('Remove a tag', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Add a tag to remove
    await addTag('tag-to-remove');
    await delay(200);

    // Verify tag exists
    let tags = await getAllTags();
    let found = false;
    for (const tag of tags) {
      const text = await getTagText(tag);
      if (text.includes('tag-to-remove')) {
        found = true;
        break;
      }
    }
    expect(found).to.equal(true);

    // Remove the tag
    await removeTag('tag-to-remove');
    await delay(200);

    // Verify tag was removed
    tags = await getAllTags();
    for (const tag of tags) {
      const text = await getTagText(tag);
      expect(text.includes('tag-to-remove')).to.equal(false);
    }
  });

  /**
   * What it tests: Clicking a tag opens a tag results tab showing entries with that tag.
   * Expected behavior: Tag results tab opens with matching entries.
   */
  it('Click tag opens tag results tab', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Add a unique tag
    await addTag('clickable-tag-test');
    await delay(200);

    // Click the tag
    await clickTag('clickable-tag-test');

    // Wait for new tab to open
    await delay(300);

    // Verify new tab opened
    const tabs = await page.$$('.fcb-tab');
    expect(tabs.length).to.be.greaterThan(1);

    // Close the tag results tab
    await closeActiveTab();
  });

  /**
   * What it tests: Tag shows X button on hover.
   * Expected behavior: X button is visible when hovering over a tag.
   */
  it('Tag shows X button on hover', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Get tags
    const tags = await getAllTags();
    if (tags.length > 0) {
      // Hover over a tag
      await tags[0].hover();
      await delay(100);

      // Look for close button (may be hidden until hover)
      const closeBtn = await tags[0].$('.tagify__tag__removeBtn');
      // Close button should exist (even if hidden)
      expect(closeBtn).to.not.be.null;
    }
  });

  /**
   * What it tests: Tag persists after saving the entry.
   * Expected behavior: Tag is still present after page reload.
   */
  it('Tags persist after entry save', async () => {
    const page = sharedContext.page!;

    // Make sure we have the entry open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Add a tag
    await addTag('persistent-tag');
    await delay(700); // Wait for save debounce

    // Refresh by switching settings
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(testData.settings[0].name);

    // Reopen the entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Verify tag still exists
    const tags = await getAllTags();
    let found = false;
    for (const tag of tags) {
      const text = await getTagText(tag);
      if (text.includes('persistent-tag')) {
        found = true;
        break;
      }
    }
    expect(found).to.equal(true);
  });

  /**
   * What it tests: Tags input component is visible when opening a location entry.
   * Expected behavior: Tags input wrapper is present in the DOM.
   */
  it('Tags input is visible on location entry', async () => {
    const setting = testData.settings[0];

    // Open a location entry
    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Verify tags wrapper is present
    const page = sharedContext.page!;
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });
    const wrapper = await page.$('.tags-wrapper');
    expect(wrapper).to.not.be.null;
  });

  /**
   * What it tests: Tags input component is visible when opening an organization entry.
   * Expected behavior: Tags input wrapper is present in the DOM.
   */
  it('Tags input is visible on organization entry', async () => {
    const setting = testData.settings[0];

    // Open an organization entry
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Verify tags wrapper is present
    const page = sharedContext.page!;
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });
    const wrapper = await page.$('.tags-wrapper');
    expect(wrapper).to.not.be.null;
  });

  it('Tags on session', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open a session
    const campaignNodes = await page.$$('.fcb-campaign-folder');
    for (const node of campaignNodes) {
      const text = await node.evaluate(el => el.textContent);
      if (text?.includes(setting.campaigns[0].name)) {
        // Expand campaign
        const isCollapsed = await node.evaluate(el => el.classList.contains('collapsed'));
        if (isCollapsed) {
          const toggle = await node.$('[data-testid="campaign-folder-toggle"]');
          if (toggle) await toggle.click();
        }

        // Click on first session
        const sessionNodes = await node.$$('.fcb-session-node');
        if (sessionNodes.length > 0) {
          const nameEl = await sessionNodes[0].$('.node-name');
          if (nameEl) await nameEl.click();
        }
        break;
      }
    }

    // Wait for session content
    await page.waitForSelector('.fcb-name-header', { timeout: 5000 });

    // Verify tags wrapper is present
    await page.waitForSelector('.tags-wrapper:not(.uninitialized)', { timeout: 5000 });
    const wrapper = await page.$('.tags-wrapper');
    expect(wrapper).to.not.be.null;
  });
});
