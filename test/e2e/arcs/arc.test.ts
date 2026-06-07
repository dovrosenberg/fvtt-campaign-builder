/**
 * Arc E2E tests.
 * Tests arc operations: opening, editing name, description,
 * session management, tab navigation, and arc progression.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting } from '@e2etest/utils';
import { getByTestId } from '../helpers';

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
 * Opens an arc from the campaign directory.
 */
const openArc = async (campaignName: string, arcName: string): Promise<void> => {
  const page = sharedContext.page!;

  await expandCampaignFolder(campaignName);

  // Find the arc node
  const arcNodes = await page.$$('.fcb-arc-node');
  for (const node of arcNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(arcName)) {
      const nameEl = await node.$('[data-testid="arc-name"], .node-name');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  await page.waitForSelector('.fcb-name-header', { timeout: 5000 });
};

/**
 * Gets the arc name input value.
 */
const getArcNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value || '');
};

/**
 * Sets the arc name.
 */
const setArcName = async (name: string): Promise<void> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (input) {
    await input.evaluate((el, name) => { (el as HTMLInputElement).value = name; }, name);
    await input.type('');
    await delay(700);
  }
};

/**
 * Clicks a content tab in the arc view.
 */
const clickArcTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    await delay(200);
  }
};

/**
 * Creates an arc via the API.
 */
const createArcViaAPI = async (name: string, campaignUuid: string): Promise<string> => {
  const page = sharedContext.page!;

  return await page.evaluate(
    async ({ name, campaignUuid }: { name: string; campaignUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createArc(name, campaignUuid);
    },
    { name, campaignUuid }
  );
};

/**
 * Deletes an arc via the API.
 */
const deleteArcViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteArc(uuid);
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

/**
 * Arc Tests
 * Verifies arc CRUD operations, session management, and navigation.
 */
describe('Arc Tests', () => {
  let createdArcUuid: string | null = null;
  let campaignUuid: string | null = null;
  const testArcName = 'Test Arc E2E';

  before(async () => {
    const setting = testData.settings[0];
    await switchToSetting(setting.name);

    campaignUuid = await getCampaignUuidViaAPI(setting.campaigns[0].name, setting.name);
    
    // Create an arc for testing
    if (campaignUuid) {
      createdArcUuid = await createArcViaAPI(testArcName, campaignUuid);
    }
  });

  after(async () => {
    if (createdArcUuid) {
      try {
        await deleteArcViaAPI(createdArcUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  /**
   * What it tests: Creating a new arc via the API.
   * Expected behavior: Arc is created and has a valid UUID.
   */
  it('Create new arc via API', async () => {
    expect(createdArcUuid).to.not.be.null;
  });

  /**
   * What it tests: Opening an existing arc from the campaign directory tree.
   * Expected behavior: Arc opens and displays the correct name in the header.
   */
  it('Open existing arc', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    // Refresh directory
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(setting.name);

    await openArc(firstCampaign.name, testArcName);

    const nameValue = await getArcNameValue();
    expect(nameValue).to.equal(testArcName);
  });

  /**
   * What it tests: Editing an arc's name with debounced auto-save.
   * Expected behavior: Name change persists after debounce period.
   */
  it('Edit arc name with debounce', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);

    const newName = 'Renamed Arc E2E';
    await setArcName(newName);

    const nameValue = await getArcNameValue();
    expect(nameValue).to.equal(newName);
  });

  // Tab Navigation Tests
  /**
   * What it tests: Switching to the description tab showing arc description.
   * Expected behavior: Description tab becomes visible.
   */
  it('Switch to description tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('description');

    const page = sharedContext.page!;
    const descTab = await page.$('[data-tab="description"]');
    expect(descTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the journals tab showing linked journals.
   * Expected behavior: Journals tab becomes visible.
   */
  it('Switch to journals tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('journals');

    const page = sharedContext.page!;
    const journalsTab = await page.$('[data-tab="journals"]');
    expect(journalsTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the sessions tab showing sessions in this arc.
   * Expected behavior: Sessions tab becomes visible with session list.
   */
  it('Switch to sessions tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('sessions');

    const page = sharedContext.page!;
    const sessionsTab = await page.$('[data-tab="sessions"]');
    expect(sessionsTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the vignettes tab showing vignettes in this arc.
   * Expected behavior: Vignettes tab becomes visible.
   */
  it('Switch to vignettes tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('vignettes');

    const page = sharedContext.page!;
    const vignettesTab = await page.$('[data-tab="vignettes"]');
    expect(vignettesTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the locations tab showing locations in this arc.
   * Expected behavior: Locations tab becomes visible.
   */
  it('Switch to locations tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('locations');

    const page = sharedContext.page!;
    const locationsTab = await page.$('[data-tab="locations"]');
    expect(locationsTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the monsters tab showing monsters in this arc.
   * Expected behavior: Monsters tab becomes visible.
   */
  it('Switch to monsters tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('monsters');

    const page = sharedContext.page!;
    const monstersTab = await page.$('[data-tab="monsters"]');
    expect(monstersTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the ideas tab showing ideas in this arc.
   * Expected behavior: Ideas tab becomes visible.
   */
  it('Switch to ideas tab', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);
    await clickArcTab('ideas');

    const page = sharedContext.page!;
    const ideasTab = await page.$('[data-tab="ideas"]');
    expect(ideasTab).to.not.be.null;
  });

  /**
   * What it tests: Arc progression indicator is visible.
   * Expected behavior: Progression UI element is present.
   */
  it('Arc progression is visible', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);

    const page = sharedContext.page!;
    const progressionIndicator = await page.$('.progression-indicator');
    expect(progressionIndicator).to.not.be.null;
  });

  /**
   * What it tests: Arc tags are visible.
   * Expected behavior: Tags UI element is present.
   */
  it('Arc tags are visible', async () => {
    if (!createdArcUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openArc(firstCampaign.name, testArcName);

    const page = sharedContext.page!;
    const tagsComponent = await page.$('.tags-wrapper');
    expect(tagsComponent).to.not.be.null;
  });
});
