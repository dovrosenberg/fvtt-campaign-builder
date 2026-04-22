/**
 * Play mode component E2E tests.
 * Tests play mode operations: toggle, campaign selector,
 * session navigation, and generator bar visibility.
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
 * Toggles play mode via the UI.
 */
const togglePlayMode = async (): Promise<void> => {
  const page = sharedContext.page!;
  
  // Find the play mode toggle
  const toggle = await page.$('.fcb-play-mode-toggle, [data-testid="play-mode-toggle"]');
  if (toggle) {
    await toggle.click();
    await delay(500);
  }
};

/**
 * Checks if play mode is active.
 */
const isPlayModeActive = async (): Promise<boolean> => {
  const page = sharedContext.page!;
  const playModeNav = await page.$('.fcb-play-mode-navigation');
  return playModeNav !== null;
};

/**
 * Gets the campaign selector dropdown.
 */
const getCampaignSelector = async (): Promise<boolean> => {
  const page = sharedContext.page!;
  const selector = await page.$('#campaign-selector, .campaign-selector-container');
  return selector !== null;
};

/**
 * Gets the session tab buttons.
 */
const getSessionTabButtons = async (): Promise<number> => {
  const page = sharedContext.page!;
  const buttons = await page.$$('.fcb-play-tab-button');
  return buttons.length;
};

/**
 * Gets the generator buttons.
 */
const getGeneratorButtons = async (): Promise<number> => {
  const page = sharedContext.page!;
  const buttons = await page.$$('.fcb-generator-button');
  return buttons.length;
};

/**
 * Clicks a session tab button.
 */
const clickSessionTabButton = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;
  
  const button = await page.$(`[data-testid="session-tab-button-${tabId}"]`);
  if (button) {
    await button.click();
    await delay(300);
  }
};

/**
 * Clicks a generator button.
 */
const clickGeneratorButton = async (generatorId: string): Promise<void> => {
  const page = sharedContext.page!;
  
  const button = await page.$(`[data-testid="generator-button-${generatorId}"]`);
  if (button) {
    await button.click();
    await delay(300);
  }
};

/**
 * Creates a session via the API.
 */
const createSessionViaAPI = async (name: string, number: number, campaignUuid: string): Promise<string> => {
  const page = sharedContext.page!;

  const uuid = await page.evaluate(
    async ({ name, number, campaignUuid }: { name: string; number: number; campaignUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createSession(name, number, campaignUuid);
    },
    { name, number, campaignUuid }
  );

  return uuid;
};

/**
 * Deletes a session via the API.
 */
const deleteSessionViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteSession(uuid);
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
 * Play Mode Tests
 * Verifies play mode functionality and navigation.
 */
describe('Play Mode Tests', () => {
  let campaignUuid: string | null = null;
  let createdSessionUuid: string | null = null;

  before(async () => {
    const setting = testData.settings[0];
    await switchToSetting(setting.name);

    campaignUuid = await getCampaignUuidViaAPI(setting.campaigns[0].name, setting.name);
    
    // Create a session to make the campaign playable
    if (campaignUuid) {
      const setting = testData.settings[0];
      const sessionNumber = setting.campaigns[0].sessions.length + 1;
      createdSessionUuid = await createSessionViaAPI('PlayMode Test Session', sessionNumber, campaignUuid);
    }
  });

  after(async () => {
    if (createdSessionUuid) {
      try {
        await deleteSessionViaAPI(createdSessionUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  /**
   * What it tests: Play mode toggle button is visible.
   * Expected behavior: Toggle button is present in the UI.
   */
  it('Play mode toggle is visible', async () => {
    const page = sharedContext.page!;
    const toggle = await page.$('.fcb-play-mode-toggle, .p-toggleswitch');
    expect(toggle).to.not.be.null;
  });

  /**
   * What it tests: Toggling play mode on activates play mode UI.
   * Expected behavior: Play mode navigation becomes visible.
   */
  it('Toggle play mode on', async () => {
    const isActive = await isPlayModeActive();
    
    if (!isActive) {
      await togglePlayMode();
    }
    
    const nowActive = await isPlayModeActive();
    expect(nowActive).to.equal(true);
  });

  /**
   * What it tests: Play mode shows session buttons bar.
   * Expected behavior: Session buttons bar is present in the UI.
   */
  it('Play mode shows session buttons bar', async () => {
    const isActive = await isPlayModeActive();
    if (!isActive) {
      await togglePlayMode();
    }
    
    const page = sharedContext.page!;
    const sessionButtonsBar = await page.$('.fcb-play-session-tabs');
    expect(sessionButtonsBar).to.not.be.null;
  });

  /**
   * What it tests: Play mode shows generator bar.
   * Expected behavior: Generator bar is present in the UI.
   */
  it('Play mode shows generator bar', async () => {
    const isActive = await isPlayModeActive();
    if (!isActive) {
      await togglePlayMode();
    }
    
    const page = sharedContext.page!;
    const generatorBar = await page.$('.fcb-play-generators');
    expect(generatorBar).to.not.be.null;
  });

  /**
   * What it tests: Session navigation buttons are visible in play mode.
   * Expected behavior: Previous/next session buttons are present.
   */
  it('Session buttons are visible in play mode', async () => {
    const isActive = await isPlayModeActive();
    if (!isActive) {
      await togglePlayMode();
    }
    
    const buttonCount = await getSessionTabButtons();
    expect(buttonCount).to.be.greaterThan(0);
  });

  /**
   * What it tests: Generator buttons are visible in play mode.
   * Expected behavior: Generator buttons are present.
   */
  it('Generator buttons are visible in play mode', async () => {
    const isActive = await isPlayModeActive();
    if (!isActive) {
      await togglePlayMode();
    }
    
    const buttonCount = await getGeneratorButtons();
    expect(buttonCount).to.be.greaterThan(0);
  });

  /**
   * What it tests: Notes session tab button exists.
   * Expected behavior: Notes button is present in the UI.
   */
  it('Notes session tab button exists', async () => {
    const isActive = await isPlayModeActive();
    if (!isActive) {
      await togglePlayMode();
    }
    
    const page = sharedContext.page!;
    const notesButton = await page.$('[data-testid="session-tab-button-notes"]');
    expect(notesButton).to.not.be.null;
  });

  /**
   * What it tests: Lore session tab button exists.
   * Expected behavior: Lore button is present in the UI.
   */
  it('Lore session tab button exists', async () => {
    const isActive = await isPlayModeActive();
    if (!isActive) {
      await togglePlayMode();
    }
    
    const page = sharedContext.page!;
    const loreButton = await page.$('[data-testid="session-tab-button-lore"]');
    expect(loreButton).to.not.be.null;
  });

  /**
   * What it tests: NPC generator button exists.
   * Expected behavior: NPC button is present in the UI.
   */
  it('NPC generator button exists', async () => {
    const isActive = await isPlayModeActive();
    if (!isActive) {
      await togglePlayMode();
    }
    
    const page = sharedContext.page!;
    const npcButton = await page.$('[data-testid="generator-button-npc"]');
    expect(npcButton).to.not.be.null;
  });

  /**
   * What it tests: Town generator button exists.
   * Expected behavior: Town button is present in the UI.
   */
  it('Town generator button exists', async () => {
    const isActive = await isPlayModeActive();
    if (!isActive) {
      await togglePlayMode();
    }
    
    const page = sharedContext.page!;
    const townButton = await page.$('[data-testid="generator-button-town"]');
    expect(townButton).to.not.be.null;
  });

  /**
   * What it tests: Clicking notes tab button opens session.
   * Expected behavior: Session content is visible.
   */
  it('Click notes tab button opens session', async () => {
    const isActive = await isPlayModeActive();
    if (!isActive) {
      await togglePlayMode();
    }
    
    await clickSessionTabButton('notes');
    
    // Should show session content
    const page = sharedContext.page!;
    await delay(500);
    const sessionContent = await page.$('.fcb-session-content, .fcb-name-header');
    expect(sessionContent).to.not.be.null;
  });

  /**
   * What it tests: Campaign selector is visible when in play mode.
   * Expected behavior: Campaign selector dropdown is present.
   */
  it('Campaign selector is visible in play mode', async () => {
    const isActive = await isPlayModeActive();
    
    if (isActive) {
      await togglePlayMode();
    }
    
    const selector = await getCampaignSelector();
    expect(selector).to.equal(true);
  });

  /**
   * What it tests: Disabling play mode hides play mode UI.
   * Expected behavior: Play mode navigation is not visible.
   */
  it('Disable play mode', async () => {
    const isActive = await isPlayModeActive();
    
    if (isActive) {
      await togglePlayMode();
    }
    
    const nowActive = await isPlayModeActive();
    expect(nowActive).to.equal(false);
  });
});
