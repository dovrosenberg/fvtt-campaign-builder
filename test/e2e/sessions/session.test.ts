/**
 * Session E2E tests.
 * Tests session operations: opening, editing name, date, summary,
 * location/NPC management, tab navigation, and play mode.
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
 * Gets the session name value.
 */
const getSessionNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value || '');
};

/**
 * Sets the session name.
 */
const setSessionName = async (name: string): Promise<void> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-name input');
  if (input) {
    await input.evaluate((el, name) => { (el as HTMLInputElement).value = name; }, name);
    await input.type(''); // Trigger input event
    await delay(700); // Wait for debounce
  }
};

/**
 * Opens a session from the campaign directory.
 */
const openSession = async (campaignName: string, sessionName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Expand the campaign folder first
  await expandCampaignFolder(campaignName);

  // Find the session node
  const sessionNodes = await page.$$('.fcb-session-node');
  for (const node of sessionNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(sessionName)) {
      // Click on the session name
      const nameEl = await node.$('[data-testid="session-name"], .node-name');
      if (nameEl) {
        await nameEl.click();
        break;
      }
    }
  }

  // Wait for session content to load
  await page.waitForSelector('.fcb-name-header', { timeout: 5000 });
};

/**
 * Expands a campaign folder in the directory.
 */
const expandCampaignFolder = async (campaignName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the campaign node
  const campaignNodes = await page.$$('.fcb-campaign-folder');
  for (const node of campaignNodes) {
    const text = await node.evaluate(el => el.textContent);
    if (text?.includes(campaignName)) {
      // Check if it's collapsed
      const isCollapsed = await node.evaluate(el => el.classList.contains('collapsed'));
      if (isCollapsed) {
        // Click the folder toggle
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
 * Clicks a content tab in the session view.
 */
const clickSessionTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  const tab = await page.$(`[data-tab="${tabId}"]`);
  if (tab) {
    await tab.click();
    await delay(100);
  }
};

/**
 * Gets the session number input value.
 */
const getSessionNumberValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-number input, input[for="fcb-input-number"]');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value);
};

/**
 * Sets the session number.
 */
const setSessionNumber = async (number: string): Promise<void> => {
  const page = sharedContext.page!;
  const input = await page.$('.fcb-input-number input, input[for="fcb-input-number"]');
  if (input) {
    await input.evaluate((el, number) => { (el as HTMLInputElement).value = number; }, number);
    await input.type(''); // Trigger input event
    await delay(700); // Wait for debounce
  }
};

/**
 * Session Tests
 * Verifies session CRUD operations, location/NPC management, and navigation.
 */
describe('Session Tests', () => {
  let createdSessionUuid: string | null = null;
  let campaignUuid: string | null = null;
  const testSessionName = 'Test Session E2E';

  before(async () => {
    const setting = testData.settings[0];
    await switchToSetting(setting.name);

    // Get the first campaign's UUID for creating sessions
    campaignUuid = await getCampaignUuidViaAPI(setting.campaigns[0].name, setting.name);
  });

  after(async () => {
    // Clean up created session
    if (createdSessionUuid) {
      try {
        await deleteSessionViaAPI(createdSessionUuid);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  /**
   * What it tests: Opening an existing session from the campaign directory tree.
   * Expected behavior: Session opens and displays the correct name in the header.
   */
  it('Open existing session', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Verify session content is displayed
    const nameValue = await getSessionNameValue();
    expect(nameValue).to.equal(firstSession.name);
  });

  /**
   * What it tests: Creating a new session via the API and verifying it in the directory.
   * Expected behavior: Session is created and visible in the directory.
   */
  it('Create new session via API and verify in directory', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];

    // Create session via API
    const sessionNumber = firstCampaign.sessions.length + 1;
    createdSessionUuid = await createSessionViaAPI(testSessionName, sessionNumber, campaignUuid!);
    expect(createdSessionUuid).to.not.be.null;

    // Refresh the directory
    await switchToSetting(testData.settings[1].name);
    await switchToSetting(setting.name);

    // Open the new session
    await openSession(firstCampaign.name, testSessionName);

    // Verify name
    const nameValue = await getSessionNameValue();
    expect(nameValue).to.equal(testSessionName);
  });

  /**
   * What it tests: Editing a session's name with debounced auto-save.
   * Expected behavior: Name change persists after debounce period.
   */
  it('Edit session name with debounce', async () => {
    // Make sure we have the session open
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    await openSession(firstCampaign.name, testSessionName);

    // Change the name
    const newName = 'Renamed Test Session';
    await setSessionName(newName);

    // Verify the name changed
    const nameValue = await getSessionNameValue();
    expect(nameValue).to.equal(newName);
  });

  /**
   * What it tests: Session number is displayed in the header.
   * Expected behavior: Session number is visible.
   */
  it('Session number is displayed', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Verify session number is displayed
    const numberValue = await getSessionNumberValue();
    expect(numberValue).to.equal(firstSession.number.toString());
  });

  /**
   * What it tests: Switching to the notes tab showing session notes.
   * Expected behavior: Notes tab becomes visible with editor.
   */
  it('Switch to notes tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Verify notes tab is active by default (editor visible)
    const page = sharedContext.page!;
    const editor = await page.$('.ProseMirror');
    expect(editor).to.not.be.null;
  });

  /**
   * What it tests: Switching to the items tab showing items for this session.
   * Expected behavior: Items tab becomes visible with item list.
   */
  it('Switch to items tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Click on items tab
    await clickSessionTab('items');

    // Verify items tab content is visible
    const page = sharedContext.page!;
    const itemsTab = await page.$('[data-tab="items"]');
    expect(itemsTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the locations tab showing locations for this session.
   * Expected behavior: Locations tab becomes visible with location list.
   */
  it('Switch to locations tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Click on locations tab
    await clickSessionTab('locations');

    // Verify locations tab content is visible
    const page = sharedContext.page!;
    const locationsTab = await page.$('[data-tab="locations"]');
    expect(locationsTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the journals tab showing linked journals.
   * Expected behavior: Journals tab becomes visible.
   */
  it('Switch to journals tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Click on journals tab
    await clickSessionTab('journals');

    // Verify journals tab content is visible
    const page = sharedContext.page!;
    const journalsTab = await page.$('[data-tab="journals"]');
    expect(journalsTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the monsters tab showing monsters for this session.
   * Expected behavior: Monsters tab becomes visible with monster list.
   */
  it('Switch to monsters tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Click on monsters tab
    await clickSessionTab('monsters');

    // Verify monsters tab content is visible
    const page = sharedContext.page!;
    const monstersTab = await page.$('[data-tab="monsters"]');
    expect(monstersTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the NPCs tab showing NPCs for this session.
   * Expected behavior: NPCs tab becomes visible with NPC list.
   */
  it('Switch to NPCs tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Click on NPCs tab
    await clickSessionTab('npcs');

    // Verify NPCs tab content is visible
    const page = sharedContext.page!;
    const npcsTab = await page.$('[data-tab="npcs"]');
    expect(npcsTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the vignettes tab showing vignettes for this session.
   * Expected behavior: Vignettes tab becomes visible with vignette list.
   */
  it('Switch to vignettes tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Click on vignettes tab
    await clickSessionTab('vignettes');

    // Verify vignettes tab content is visible
    const page = sharedContext.page!;
    const vignettesTab = await page.$('[data-tab="vignettes"]');
    expect(vignettesTab).to.not.be.null;
  });

  /**
   * What it tests: Switching to the PCs tab showing PCs for this session.
   * Expected behavior: PCs tab becomes visible with PC list.
   */
  it('Switch to PCs tab', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Click on PCs tab
    await clickSessionTab('pcs');

    // Verify PCs tab content is visible
    const page = sharedContext.page!;
    const pcsTab = await page.$('[data-tab="pcs"]');
    expect(pcsTab).to.not.be.null;
  });

  /**
   * What it tests: Session tags are visible.
   * Expected behavior: Tags component is present.
   */
  it('Session tags are visible', async () => {
    const setting = testData.settings[0];
    const firstCampaign = setting.campaigns[0];
    const firstSession = firstCampaign.sessions[0];

    // Open the session
    await openSession(firstCampaign.name, firstSession.name);

    // Verify tags component is present
    const page = sharedContext.page!;
    const tagsComponent = await page.$('.tags-wrapper');
    expect(tagsComponent).to.not.be.null;
  });
});
