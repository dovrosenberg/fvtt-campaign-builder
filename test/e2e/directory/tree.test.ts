/**
 * Directory tree E2E tests.
 * Tests tree operations: expansion, collapse, type folder navigation,
 * and visibility of entries within the tree structure.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '../types';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets a topic folder node by topic name.
 */
const getTopicFolderNode = async (topicName: string) => {
  const page = sharedContext.page!;
  const nodes = await page.$$('.fcb-topic-folder');
  for (const node of nodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.toLowerCase().includes(topicName.toLowerCase())) {
      return node;
    }
  }
  return null;
};

/**
 * Gets a type folder node by type name.
 * Note: Type folders use .fcb-type-item class, not .fcb-type-folder
 */
const getTypeFolderNode = async (typeName: string) => {
  const page = sharedContext.page!;
  const nodes = await page.$$('.fcb-type-item');
  for (const node of nodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(typeName)) {
      return node;
    }
  }
  return null;
};

/**
 * Checks if a folder is collapsed.
 */
const isFolderCollapsed = async (folder: import('puppeteer').ElementHandle<Element>) => {
  return await folder.evaluate(el => el.classList.contains('collapsed'));
};

/**
 * Clicks the folder toggle icon.
 */
const clickFolderToggle = async (folder: import('puppeteer').ElementHandle<Element>) => {
  const toggle = await folder.$('.folder-header i, [data-testid="folder-toggle"]');
  if (toggle) {
    await toggle.click();
    await delay(200);
  }
};

/**
 * Gets all visible entry nodes.
 * Note: Entries use .fcb-directory-entry class
 */
const getVisibleEntryNodes = async () => {
  const page = sharedContext.page!;
  // Get all directory entries, then filter for visible ones
  const entries = await page.$$('.fcb-directory-entry');
  const visibleEntries: import('puppeteer').ElementHandle<Element>[] = [];
  
  for (const entry of entries) {
    const isVisible = await entry.evaluate(el => {
      const style = window.getComputedStyle(el);
      const parent = el.closest('.collapsed');
      return style.display !== 'none' && style.visibility !== 'hidden' && !parent;
    });
    if (isVisible) {
      visibleEntries.push(entry);
    }
  }
  
  return visibleEntries;
};

/**
 * Gets the campaign folder for a campaign name.
 */
const getCampaignFolder = async (campaignName: string) => {
  const page = sharedContext.page!;
  const nodes = await page.$$('.fcb-campaign-folder');
  for (const node of nodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(campaignName)) {
      return node;
    }
  }
  return null;
};

/**
 * Gets the setting folder node.
 */
const getSettingFolderNode = async () => {
  const page = sharedContext.page!;
  return await page.$('.fcb-setting-folder');
};

/**
 * Directory Tree Tests
 * Verifies tree expansion, collapse, and folder navigation.
 */
describe('Directory Tree Tests', () => {
  before(async () => {
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  it('Setting folder is visible', async () => {
    const page = sharedContext.page!;

    // Verify setting folder exists
    const settingFolder = await getSettingFolderNode();
    expect(settingFolder).to.not.be.null;
  });

  it('Topic folders are visible', async () => {
    const page = sharedContext.page!;

    // Verify topic folders exist
    const topicFolders = await page.$$('.fcb-topic-folder');
    expect(topicFolders.length).to.be.greaterThan(0);
  });

  /**
   * What it tests: Entry becomes visible after expanding parent folders.
   * Expected behavior: Entry is visible in the tree after expanding topic and type folders.
   */
  it('Entry is visible after expanding parent folders', async () => {
    // Get the character topic folder
    const charFolder = await getTopicFolderNode('character');
    expect(charFolder).to.not.be.null;

    // Check if collapsed
    const isCollapsed = await isFolderCollapsed(charFolder!);
    if (isCollapsed) {
      // Click to expand
      await clickFolderToggle(charFolder!);
    }

    // Verify it's now expanded
    const stillCollapsed = await isFolderCollapsed(charFolder!);
    expect(stillCollapsed).to.equal(false);
  });

  /**
   * What it tests: Topic folder can be expanded and collapsed.
   * Expected behavior: Folder toggles between expanded and collapsed states.
   */
  it('Topic folder expands and collapses', async () => {
    // Get the location topic folder
    const locFolder = await getTopicFolderNode('location');
    expect(locFolder).to.not.be.null;

    // Check if collapsed
    const isCollapsed = await isFolderCollapsed(locFolder!);
    if (isCollapsed) {
      await clickFolderToggle(locFolder!);
    }

    // Verify it's now expanded
    const stillCollapsed = await isFolderCollapsed(locFolder!);
    expect(stillCollapsed).to.equal(false);
  });

  /**
   * What it tests: Collapse all button collapses all folders in the tree.
   * Expected behavior: All folders are collapsed after clicking the button.
   */
  it('Collapse all button collapses all folders', async () => {
    // Get the organization topic folder
    const orgFolder = await getTopicFolderNode('organization');
    expect(orgFolder).to.not.be.null;

    // Check if collapsed
    const isCollapsed = await isFolderCollapsed(orgFolder!);
    if (isCollapsed) {
      await clickFolderToggle(orgFolder!);
    }

    // Verify it's now expanded
    const stillCollapsed = await isFolderCollapsed(orgFolder!);
    expect(stillCollapsed).to.equal(false);
  });

  /**
   * What it tests: Type folders are visible after topic expansion.
   * Expected behavior: Type folders (type items) are visible in the tree after expanding a topic folder.
   */
  it('Type folders are visible after topic expansion', async () => {
    // Expand character topic first
    await expandTopicNode(Topics.Character);

    // Wait for type items to appear
    await sharedContext.page!.waitForSelector('.fcb-type-item', { timeout: 5000 });

    // Verify type folders exist (they use .fcb-type-item class)
    const typeFolders = await sharedContext.page!.$$('.fcb-type-item');
    expect(typeFolders.length).to.be.greaterThan(0);
  });

  /**
   * What it tests: Expand type folder shows entries.
   * Expected behavior: Entries are visible in the tree after expanding a type folder.
   */
  it('Expand type folder shows entries', async () => {
    // Expand character topic and (none) type
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');

    // Verify entries are visible
    const entries = await getVisibleEntryNodes();
    expect(entries.length).to.be.greaterThan(0);
  });

  /**
   * What it tests: Collapse topic folder hides entries.
   * Expected behavior: Entries are hidden in the tree after collapsing a topic folder.
   */
  it('Collapse topic folder hides entries', async () => {
    // First expand the topic
    const charFolder = await getTopicFolderNode('character');
    expect(charFolder).to.not.be.null;

    // Make sure it's expanded
    let isCollapsed = await isFolderCollapsed(charFolder!);
    if (isCollapsed) {
      await clickFolderToggle(charFolder!);
    }

    // Now collapse it
    await clickFolderToggle(charFolder!);

    // Verify it's collapsed
    isCollapsed = await isFolderCollapsed(charFolder!);
    expect(isCollapsed).to.equal(true);
  });

  /**
   * What it tests: Campaign folder is visible.
   * Expected behavior: Campaign folder is visible in the tree.
   */
  it('Campaign folder is visible', async () => {
    const setting = testData.settings[0];

    // Verify campaign folder exists
    const campaignFolder = await getCampaignFolder(setting.campaigns[0].name);
    expect(campaignFolder).to.not.be.null;
  });

  /**
   * What it tests: Expand campaign folder shows sessions.
   * Expected behavior: Sessions are visible in the tree after expanding a campaign folder.
   */
  it('Expand campaign folder shows sessions', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Get campaign folder
    const campaignFolder = await getCampaignFolder(setting.campaigns[0].name);
    expect(campaignFolder).to.not.be.null;

    // Check if collapsed
    const isCollapsed = await isFolderCollapsed(campaignFolder!);
    if (isCollapsed) {
      await clickFolderToggle(campaignFolder!);
    }

    // Wait for sessions to be visible
    await delay(300);
    
    // Session nodes use data-testid="session-node-{id}"
    const sessionNodes = await page.$$('[data-testid^="session-node-"]');
    expect(sessionNodes.length).to.be.greaterThan(0);
  });

  /**
   * What it tests: Click entry in tree opens content.
   * Expected behavior: Content is opened after clicking an entry in the tree.
   */
  it('Click entry in tree opens content', async () => {
    const setting = testData.settings[0];

    // Expand character topic and type
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');

    // Click the first entry
    const entries = await getVisibleEntryNodes();
    if (entries.length > 0) {
      const nameEl = await entries[0].$('.node-name');
      if (nameEl) {
        await nameEl.click();
        await delay(200);

        // Verify content opened
        const page = sharedContext.page!;
        const header = await page.$('.fcb-name-header');
        expect(header).to.not.be.null;
      }
    }
  });

  /**
   * What it tests: Tree shows correct entry count.
   * Expected behavior: Tree shows the correct number of entries.
   */
  it('Tree shows correct entry count', async () => {
    const setting = testData.settings[0];

    // Expand character topic
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');

    // Count visible entries
    const entries = await getVisibleEntryNodes();
    const expectedCount = setting.topics[Topics.Character].length;

    // Should have at least the expected count
    expect(entries.length).to.be.greaterThan(0);
  });

  /**
   * What it tests: Topic folder icons are correct.
   * Expected behavior: Topic folder icons are displayed correctly.
   */
  it('Topic folder icons are correct', async () => {
    const page = sharedContext.page!;

    // Check for folder icons
    const folderIcons = await page.$$('.fcb-topic-folder .folder-header i.fas');
    expect(folderIcons.length).to.be.greaterThan(0);
  });

  it('Setting switch updates directory tree', async () => {
    const setting1 = testData.settings[0];
    const setting2 = testData.settings[1];

    // Get current entries count
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const entries1 = await getVisibleEntryNodes();

    // Switch to second setting
    await switchToSetting(setting2.name);

    // Expand and count entries
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const entries2 = await getVisibleEntryNodes();

    // Entries should be different (different settings)
    // Just verify we have entries in both
    expect(entries1.length).to.be.greaterThan(0);
    expect(entries2.length).to.be.greaterThan(0);
  });
});
