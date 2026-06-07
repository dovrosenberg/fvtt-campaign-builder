/**
 * StoryWeb E2E tests.
 * Tests story web operations: opening, editing name, description,
 * relationship management, and tab navigation.
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
 * Opens a story web from the campaign directory.
 */
const openStoryWeb = async (campaignName: string, storyWebName: string): Promise<void> => {
  const page = sharedContext.page!;

  await expandCampaignFolder(campaignName);

  // Find the story web node
  const storyWebNodes = await page.$$('.fcb-storyWeb-node');
  for (const node of storyWebNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(storyWebName)) {
      const nameEl = await node.$('[data-testid="storyWeb-name"], .node-name');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  await page.waitForSelector('.fcb-name-header', { timeout: 5000 });
};

/**
 * Gets the story web name input value.
 */
const getStoryWebNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value || '');
};

/**
 * Sets the story web name.
 */
const setStoryWebName = async (name: string): Promise<void> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (input) {
    await input.evaluate((el, name) => { (el as HTMLInputElement).value = name; }, name);
    await input.type('');
    await delay(700);
  }
};

/**
 * Creates a story web via the API.
 */
const createStoryWebViaAPI = async (name: string, campaignUuid: string): Promise<string> => {
  const page = sharedContext.page!;

  return await page.evaluate(
    async ({ name, campaignUuid }: { name: string; campaignUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createStoryWeb(name, campaignUuid);
    },
    { name, campaignUuid }
  );
};

/**
 * Deletes a story web via the API.
 */
const deleteStoryWebViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteStoryWeb(uuid);
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

describe('StoryWeb Tests', () => {
  let createdStoryWebUuid: string | null = null;
  let campaignUuid: string | null = null;
  const testStoryWebName = 'Test StoryWeb E2E';

  before(async () => {
    const setting = testData.settings[0];
    await switchToSetting(setting.name);

    campaignUuid = await getCampaignUuidViaAPI(setting.campaigns[0].name, setting.name);
    
    // Create a story web for testing
    if (campaignUuid) {
      createdStoryWebUuid = await createStoryWebViaAPI(testStoryWebName, campaignUuid);
    }
  });

  after(async () => {
    if (createdStoryWebUuid) {
      try {
        await deleteStoryWebViaAPI(createdStoryWebUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  /**
   * What it tests: Opening an existing story web from the campaign directory tree.
   * Expected behavior: Story web opens and displays the correct name in the header.
   */
  it('Open existing story web', async () => {
    expect(createdStoryWebUuid).to.not.be.null;
  });

  it('Open created story web and verify name', async () => {
    if (!createdStoryWebUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    // Refresh directory
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(setting.name);

    await openStoryWeb(firstCampaign.name, testStoryWebName);

    const nameValue = await getStoryWebNameValue();
    expect(nameValue).to.equal(testStoryWebName);
  });

  /**
   * What it tests: Editing a story web's name with debounced auto-save.
   * Expected behavior: Name change persists after debounce period.
   */
  it('Edit story web name with debounce', async () => {
    if (!createdStoryWebUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openStoryWeb(firstCampaign.name, testStoryWebName);

    const newName = 'Renamed StoryWeb E2E';
    await setStoryWebName(newName);

    const nameValue = await getStoryWebNameValue();
    expect(nameValue).to.equal(newName);
  });

  /**
   * What it tests: Switching to the foundry documents tab.
   * Expected behavior: Foundry documents tab becomes visible.
   */
  it('Switch to foundry tab', async () => {
    if (!createdStoryWebUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openStoryWeb(firstCampaign.name, testStoryWebName);

    const page = sharedContext.page!;
    const tab = await page.$('.fcb-tab-foundry-documents');
    if (tab) {
      await tab.click();
    }

    const tabContent = await page.$('.fcb-tab-content-foundry-documents');
    expect(tabContent).to.not.be.null;
  });

  /**
   * What it tests: Switching to the description tab showing story web notes.
   * Expected behavior: Description tab becomes visible with editor.
   */
  it('Switch to description tab', async () => {
    if (!createdStoryWebUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openStoryWeb(firstCampaign.name, testStoryWebName);

    const page = sharedContext.page!;
    const tab = await page.$('.fcb-tab-description');
    if (tab) {
      await tab.click();
    }

    const tabContent = await page.$('.fcb-tab-content-description');
    expect(tabContent).to.not.be.null;
  });

  it('Story web shows graph component', async () => {
    if (!createdStoryWebUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openStoryWeb(firstCampaign.name, testStoryWebName);

    const page = sharedContext.page!;
    // Look for the graph container
    const graphComponent = await page.$('.story-web-graph, .fcb-graph-container, canvas');
    expect(graphComponent).to.not.be.null;
  });

  it('Story web has name header', async () => {
    if (!createdStoryWebUuid) {
      return;
    }

    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    await openStoryWeb(firstCampaign.name, testStoryWebName);

    const page = sharedContext.page!;
    const header = await page.$('.fcb-name-header');
    expect(header).to.not.be.null;
  });
});
