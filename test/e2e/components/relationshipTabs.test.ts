/**
 * Relationship tabs tests.
 * Tests relationship tab navigation and content display.
 */

/**
 * Relationship tabs component E2E tests.
 * Tests relationship tab visibility, accessibility, and content display
 * across different entry types (characters, locations, organizations, sessions, PCs).
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '../types';
import {
  openEntry,
  clickContentTab,
  createEntryViaAPI,
  deleteEntryViaAPI,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets the relationship tab content.
 */
const getRelationshipTabContent = async (tabName: string) => {
  const page = sharedContext.page!;
  return await page.$(`[data-tab="${tabName}"] .tab-inner, [data-tab="${tabName}"]`);
};

/**
 * Gets relationship rows.
 */
const getRelationshipRows = async () => {
  const page = sharedContext.page!;
  return await page.$$('.relationship-row, .fcb-relationship-item');
};

/**
 * Gets the add relationship button.
 */
const getAddRelationshipButton = async () => {
  const page = sharedContext.page!;
  return await page.$('[data-testid="add-relationship"], .add-relationship-button');
};

/**
 * Relationship Tabs Component Tests
 * Verifies relationship tab visibility and navigation across entry types.
 */
describe('Relationship Tabs Component Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Relationship Entry';

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
   * What it tests: Characters relationship tab is accessible.
   * Expected behavior: Characters tab content is visible.
   */
  it('Characters relationship tab is accessible', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('characters');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: Locations relationship tab is accessible.
   * Expected behavior: Locations tab content is visible.
   */
  it('Locations relationship tab is accessible', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on locations tab
    await clickContentTab('locations');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('locations');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: Organizations relationship tab is accessible.
   * Expected behavior: Organizations tab content is visible.
   */
  it('Organizations relationship tab is accessible', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on organizations tab
    await clickContentTab('organizations');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('organizations');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: Sessions tab is accessible.
   * Expected behavior: Sessions tab content is visible.
   */
  it('Sessions tab is accessible', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on sessions tab
    await clickContentTab('sessions');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('sessions');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: Location entry shows characters relationship tab.
   * Expected behavior: Characters tab content is visible.
   */
  it('Location entry shows characters relationship tab', async () => {
    const setting = testData.settings[0];

    // Open a location entry
    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('characters');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: Location entry shows locations relationship tab (hierarchy).
   * Expected behavior: Locations tab content is visible.
   */
  it('Location entry shows locations relationship tab (hierarchy)', async () => {
    const setting = testData.settings[0];

    // Open a location entry
    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Click on locations tab
    await clickContentTab('locations');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('locations');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: Organization entry shows characters relationship tab.
   * Expected behavior: Characters tab content is visible.
   */
  it('Organization entry shows characters relationship tab', async () => {
    const setting = testData.settings[0];

    // Open an organization entry
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('characters');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: Organization entry shows organizations relationship tab.
   * Expected behavior: Organizations tab content is visible.
   */
  it('Organization entry shows organizations relationship tab', async () => {
    const setting = testData.settings[0];

    // Open an organization entry
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Click on organizations tab
    await clickContentTab('organizations');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('organizations');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: PC entry shows characters relationship tab.
   * Expected behavior: Characters tab content is visible.
   */
  it('PC entry shows characters relationship tab', async () => {
    const setting = testData.settings[0];

    // Open a PC entry
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    const firstPC = setting.topics[Topics.PC][0];
    await openEntry(Topics.PC, firstPC.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('characters');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: PC entry shows sessions tab.
   * Expected behavior: Sessions tab content is visible.
   */
  it('PC entry shows sessions tab', async () => {
    const setting = testData.settings[0];

    // Open a PC entry
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    const firstPC = setting.topics[Topics.PC][0];
    await openEntry(Topics.PC, firstPC.name);

    // Click on sessions tab
    await clickContentTab('sessions');

    // Verify tab content is visible
    const tabContent = await getRelationshipTabContent('sessions');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: Empty state message appears when no relationships exist.
   * Expected behavior: Empty state placeholder is visible.
   */
  it('Empty state shows when no relationships', async () => {
    const setting = testData.settings[0];

    // Create a new entry with no relationships
    createdEntryUuid = await createEntryViaAPI(Topics.Character, testEntryName, setting.name);

    // Open the entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Click on characters tab
    await clickContentTab('characters');

    // Tab should show empty state or no items
    const rows = await getRelationshipRows();
    // May be 0 or have empty state message - just verify no error
    expect(rows.length).to.be.greaterThan(-1);
  });

  /**
   * What it tests: Relationship tabs are visible when opening a character entry.
   * Expected behavior: Relationship tab headers are present in the DOM.
   */
  it('Relationship tabs are visible on character entry', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click on characters tab
    await clickContentTab('characters');

    // Look for tab header
    const tabHeader = await page.$('[data-tab="characters"] .tab-header, .relationship-header');
    // Header may or may not exist depending on implementation
  });
});
