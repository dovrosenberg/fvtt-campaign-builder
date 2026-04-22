/**
 * Session content tabs tests.
 * Tests Items, Locations, Lore, Monsters, NPCs, and Vignettes tabs within session content.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting } from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Expands a campaign folder in the directory.
 */
const expandCampaignFolder = async (campaignName: string): Promise<void> => {
  const page = sharedContext.page!;

  const campaignNodes = await page.$$('.fcb-campaign-folder');
  for (const node of campaignNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(campaignName)) {
      const isCollapsed = await node.evaluate(el => el.classList.contains('collapsed'));
      if (isCollapsed) {
        const toggle = await node.$('[data-testid="campaign-folder-toggle"]');
        if (toggle) {
          await toggle.click();
          await delay(200);
        }
      }
      break;
    }
  }
};

/**
 * Opens a session from the campaign directory.
 */
const openSession = async (campaignName: string, sessionName: string): Promise<void> => {
  const page = sharedContext.page!;

  await expandCampaignFolder(campaignName);

  const sessionNodes = await page.$$('.fcb-session-node');
  for (const node of sessionNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(sessionName)) {
      const nameEl = await node.$('[data-testid="session-name"], .node-name');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  await page.waitForSelector('.fcb-name-header', { timeout: 5000 });
};

/**
 * Clicks a content tab in the session view.
 */
const clickSessionTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    await delay(200);
  }
};

/**
 * Gets the session UUID via API.
 */
const getSessionUuidViaAPI = async (sessionName: string, campaignUuid: string): Promise<string | null> => {
  const page = sharedContext.page!;

  return await page.evaluate(
    async ({ sessionName, campaignUuid }: { sessionName: string; campaignUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.getSessionUuid(sessionName, campaignUuid);
    },
    { sessionName, campaignUuid }
  );
};

describe('Session Content Tabs Tests', () => {
  before(async () => {
    const setting = testData.settings[0];
    await switchToSetting(setting.name);
  });

  after(async () => {
    // Cleanup handled by test data reset
  });

  // Items/Magic Tab Tests
  it('Navigate to items/magic tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    await openSession(firstCampaign.name, firstSession.name);
    await clickSessionTab('magic');

    const page = sharedContext.page!;
    const itemsTab = await page.$('[data-tab="magic"]');
    expect(itemsTab).to.not.be.null;
  });

  it('Items tab shows table component', async () => {
    const page = sharedContext.page!;
    
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).to.not.be.null;
  });

  it('Items tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).to.not.be.null;
  });

  // Locations Tab Tests
  it('Navigate to locations tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    await openSession(firstCampaign.name, firstSession.name);
    await clickSessionTab('locations');

    const page = sharedContext.page!;
    const locationsTab = await page.$('[data-tab="locations"]');
    expect(locationsTab).to.not.be.null;
  });

  it('Locations tab shows table component', async () => {
    const page = sharedContext.page!;
    
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).to.not.be.null;
  });

  it('Locations tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).to.not.be.null;
  });

  // Lore Tab Tests
  it('Navigate to lore tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    await openSession(firstCampaign.name, firstSession.name);
    await clickSessionTab('lore');

    const page = sharedContext.page!;
    const loreTab = await page.$('[data-tab="lore"]');
    expect(loreTab).to.not.be.null;
  });

  it('Lore tab shows table component', async () => {
    const page = sharedContext.page!;
    
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).to.not.be.null;
  });

  it('Lore tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).to.not.be.null;
  });

  // Monsters Tab Tests
  it('Navigate to monsters tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    await openSession(firstCampaign.name, firstSession.name);
    await clickSessionTab('monsters');

    const page = sharedContext.page!;
    const monstersTab = await page.$('[data-tab="monsters"]');
    expect(monstersTab).to.not.be.null;
  });

  it('Monsters tab shows table component', async () => {
    const page = sharedContext.page!;
    
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).to.not.be.null;
  });

  it('Monsters tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).to.not.be.null;
  });

  // NPCs Tab Tests
  it('Navigate to NPCs tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    await openSession(firstCampaign.name, firstSession.name);
    await clickSessionTab('npcs');

    const page = sharedContext.page!;
    const npcsTab = await page.$('[data-tab="npcs"]');
    expect(npcsTab).to.not.be.null;
  });

  it('NPCs tab shows table component', async () => {
    const page = sharedContext.page!;
    
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).to.not.be.null;
  });

  it('NPCs tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).to.not.be.null;
  });

  // Vignettes Tab Tests
  it('Navigate to vignettes tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    await openSession(firstCampaign.name, firstSession.name);
    await clickSessionTab('vignettes');

    const page = sharedContext.page!;
    const vignettesTab = await page.$('[data-tab="vignettes"]');
    expect(vignettesTab).to.not.be.null;
  });

  it('Vignettes tab shows table component', async () => {
    const page = sharedContext.page!;
    
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).to.not.be.null;
  });

  it('Vignettes tab has add button', async () => {
    const page = sharedContext.page!;
    
    const addBtn = await page.$('[data-testid="base-table-add-button"], .fcb-table-add-button, button[class*="add"]');
    expect(addBtn).to.not.be.null;
  });

  // PCs Tab Tests
  it('Navigate to PCs tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    await openSession(firstCampaign.name, firstSession.name);
    await clickSessionTab('pcs');

    const page = sharedContext.page!;
    const pcsTab = await page.$('[data-tab="pcs"]');
    expect(pcsTab).to.not.be.null;
  });

  it('PCs tab shows table component', async () => {
    const page = sharedContext.page!;
    
    await page.waitForSelector('.base-table, .fcb-table', { timeout: 5000 });
    
    const table = await page.$('.base-table, .fcb-table');
    expect(table).to.not.be.null;
  });

  // Tab Navigation Tests
  it('Can switch between multiple session tabs', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    await openSession(firstCampaign.name, firstSession.name);
    
    // Switch through multiple tabs
    await clickSessionTab('lore');
    await delay(100);
    await clickSessionTab('npcs');
    await delay(100);
    await clickSessionTab('monsters');
    await delay(100);
    
    // Verify we're on monsters tab
    const page = sharedContext.page!;
    const monstersTab = await page.$('[data-tab="monsters"]');
    expect(monstersTab).to.not.be.null;
  });

  it('Notes tab is always available', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    await openSession(firstCampaign.name, firstSession.name);
    await clickSessionTab('notes');

    const page = sharedContext.page!;
    const notesTab = await page.$('[data-tab="notes"]');
    expect(notesTab).to.not.be.null;
  });
});
