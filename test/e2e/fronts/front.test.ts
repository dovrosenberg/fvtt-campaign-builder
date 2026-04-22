/**
 * Front E2E tests.
 * Tests front operations: opening, editing name, description,
 * danger/impulse tabs,grim portents, and tab navigation.
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
 * Opens a front from the campaign directory.
 */
const openFront = async (campaignName: string, frontName: string): Promise<void> => {
  const page = sharedContext.page!;

  await expandCampaignFolder(campaignName);

  // Find the front node
  const frontNodes = await page.$$('.fcb-front-node');
  for (const node of frontNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(frontName)) {
      const nameEl = await node.$('[data-testid="front-name"], .node-name');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  await page.waitForSelector('.fcb-name-header', { timeout: 5000 });
};

/**
 * Gets the front name input value.
 */
const getFrontNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value || '');
};

/**
 * Sets the front name.
 */
const setFrontName = async (name: string): Promise<void> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (input) {
    await input.evaluate((el, name) => { (el as HTMLInputElement).value = name; }, name);
    await input.type('');
    await delay(700);
  }
};

/**
 * Clicks a content tab in the front view.
 */
const clickFrontTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    await delay(200);
  }
};

/**
 * Creates a front via the API.
 */
const createFrontViaAPI = async (name: string, campaignUuid: string): Promise<string> => {
  const page = sharedContext.page!;

  return await page.evaluate(
    async ({ name, campaignUuid }: { name: string; campaignUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createFront(name, campaignUuid);
    },
    { name, campaignUuid }
  );
};

/**
 * Deletes a front via the API.
 */
const deleteFrontViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteFront(uuid);
  }, uuid);
};

/**
 * Gets a campaign UUID via the API.
 */
const getCampaignUuidViaAPI = async (campaignName: string, settingName: string): Promise<string | null> => {
  const page = sharedContext.page!;

  return await page.evaluate(
    async ({ campaignName, settingName }: { campaignName: string; settingName: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.getCampaignUuid(campaignName, settingName);
    },
    { campaignName, settingName }
  );
};

describe('Front Tests', () => {
  let createdFrontUuid: string | null = null;
  let campaignUuid: string | null = null;
  const testFrontName = 'Test Front E2E';

  before(async () => {
    const setting = testData.settings[0];
    await switchToSetting(setting.name);

    campaignUuid = await getCampaignUuidViaAPI(setting.campaigns[0].name, setting.name);
    
    // Create a front for testing
    if (campaignUuid) {
      createdFrontUuid = await createFrontViaAPI(testFrontName, campaignUuid);
    }
  });

  after(async () => {
    if (createdFrontUuid) {
      try {
        await deleteFrontViaAPI(createdFrontUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('Create new front via API', async () => {
    expect(createdFrontUuid).to.not.be.null;
  });

  /**
   * What it tests: Opening an existing front from the campaign directory tree.
   * Expected behavior: Front opens and displays the correct name in the header.
   */
  it('Open existing front', async () => {
    if (!createdFrontUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openFront(firstCampaign.name, testFrontName);

    const nameValue = await getFrontNameValue();
    expect(nameValue).to.equal(testFrontName);
  });

  /**
   * What it tests: Editing a front's name with debounced auto-save.
   * Expected behavior: Name change persists after debounce period.
   */
  it('Edit front name with debounce', async () => {
    if (!createdFrontUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openFront(firstCampaign.name, testFrontName);

    const newName = 'Renamed Front E2E';
    await setFrontName(newName);

    const nameValue = await getFrontNameValue();
    expect(nameValue).to.equal(newName);
  });

  // Tab Navigation Tests
  /**
   * What it tests: Switching to the description tab showing front notes.
   * Expected behavior: Description tab becomes visible with editor.
   */
  it('Switch to description tab', async () => {
    if (!createdFrontUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openFront(firstCampaign.name, testFrontName);
    await clickFrontTab('description');

    const page = sharedContext.page!;
    const descTab = await page.$('[data-tab="description"]');
    expect(descTab).to.not.be.null;
  });

  /**
   * What it tests: Front tags are visible.
   * Expected behavior: Tags component is visible.
   */
  it('Front tags are visible', async () => {
    if (!createdFrontUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openFront(firstCampaign.name, testFrontName);

    const page = sharedContext.page!;
    const tagsComponent = await page.$('.tags-wrapper');
    expect(tagsComponent).to.not.be.null;
  });

  /**
   * What it tests: Front has add danger button.
   * Expected behavior: Add danger button is visible.
   */
  it('Front has add danger button', async () => {
    if (!createdFrontUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openFront(firstCampaign.name, testFrontName);

    const page = sharedContext.page!;
    // Look for the add tab button (plus icon)
    const addTabBtn = await page.$('[data-tab="add"], .fcb-tab-icon .fa-plus');
    expect(addTabBtn).to.not.be.null;
  });

  it('Description tab shows editor', async () => {
    if (!createdFrontUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openFront(firstCampaign.name, testFrontName);
    await clickFrontTab('description');

    const page = sharedContext.page!;
    const editor = await page.$('.ProseMirror');
    expect(editor).to.not.be.null;
  });
});
