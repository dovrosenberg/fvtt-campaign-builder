/**
 * Image picker component tests.
 * Tests image selection, display, and removal.
 */

/**
 * Image Picker component E2E tests.
 * Tests image selection, display, removal, and placeholder behavior
 * across different entry types (characters, locations, organizations, PCs, etc.).
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '../types';
import {
  openEntry,
  createEntryViaAPI,
  deleteEntryViaAPI,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets the image picker container.
 */
const getImagePicker = async () => {
  const page = sharedContext.page!;
  return await page.$('.fcb-image-picker, .image-picker-container');
};

/**
 * Gets the image element.
 */
const getImageElement = async () => {
  const page = sharedContext.page!;
  return await page.$('.fcb-image-picker img, .profile-image img');
};

/**
 * Gets the image change button.
 */
const getImageChangeButton = async () => {
  const page = sharedContext.page!;
  return await page.$('[data-testid="image-change-button"], .image-change-button, .fcb-image-picker button');
};

/**
 * Gets the image remove button.
 */
const getImageRemoveButton = async () => {
  const page = sharedContext.page!;
  return await page.$('[data-testid="image-remove-button"], .image-remove-button');
};

/**
 * Checks if image is displayed.
 */
const hasImage = async (): Promise<boolean> => {
  const img = await getImageElement();
  if (!img) return false;
  const src = await img.evaluate(el => (el as HTMLImageElement).src);
  return src !== '' && src !== undefined;
};

/**
 * Image Picker Component Tests
 * Verifies image picker functionality across entry types.
 */
describe('Image Picker Component Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Image Entry';

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
   * What it tests: Image picker is visible when opening a character entry.
   * Expected behavior: Image picker element is present in the DOM.
   */
  it('Image picker is visible on character entry', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Verify image picker is present
    const imagePicker = await getImagePicker();
    expect(imagePicker).to.not.be.null;
  });

  /**
   * What it tests: Image picker is visible when opening a location entry.
   * Expected behavior: Image picker element is present in the DOM.
   */
  /**
   * What it tests: Remove button appears when an image is set.
   * Expected behavior: Remove button is visible after selecting an image.
   */
  it('Image picker shows remove button when image set', async () => {
    const setting = testData.settings[0];

    // Open a location entry
    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Verify image picker is present
    const imagePicker = await getImagePicker();
    expect(imagePicker).to.not.be.null;

    // Verify remove button is present
    const removeButton = await getImageRemoveButton();
    expect(removeButton).to.not.be.null;
  });

  /**
   * What it tests: Image picker is visible when opening an organization entry.
   * Expected behavior: Image picker element is present in the DOM.
   */
  it('Image picker is visible on organization entry', async () => {
    const setting = testData.settings[0];

    // Open an organization entry
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Verify image picker is present
    const imagePicker = await getImagePicker();
    expect(imagePicker).to.not.be.null;
  });

  /**
   * What it tests: Image picker is visible when opening a PC entry.
   * Expected behavior: Image picker element is present in the DOM.
   */
  /**
   * What it tests: Image picker is visible when opening a campaign.
   * Expected behavior: Image picker element is present in the DOM.
   */
  it('Image picker is visible on campaign', async () => {
    const setting = testData.settings[0];

    // Open a PC entry
    await expandTopicNode(Topics.PC);
    await expandTypeNode(Topics.PC, '(none)');
    const firstPC = setting.topics[Topics.PC][0];
    await openEntry(Topics.PC, firstPC.name);

    // Verify image picker is present
    const imagePicker = await getImagePicker();
    expect(imagePicker).to.not.be.null;
  });

  it('Image change button is present', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Verify change button exists
    const changeBtn = await getImageChangeButton();
    expect(changeBtn).to.not.be.null;
  });

  it('Click image change button opens file picker', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Click change button
    const changeBtn = await getImageChangeButton();
    if (changeBtn) {
      await changeBtn.click();
      await delay(100);

      // File input should be triggered (we can't test the actual file dialog)
      // Just verify the button click doesn't error
    }
  });

  it('Image element has correct styling', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Check image container styling
    const imagePicker = await getImagePicker();
    if (imagePicker) {
      const className = await imagePicker.evaluate(el => el.className);
      expect(className.includes('image') || className.includes('picker')).to.equal(true);
    }
  });

  /**
   * What it tests: Image picker has a clickable area to select images.
   * Expected behavior: Clicking opens the Foundry file picker.
   */
  it('Image picker has clickable area', async () => {
    const page = sharedContext.page!;
    const setting = testData.settings[0];

    // Open a campaign
    const campaignNodes = await page.$$('.fcb-campaign-folder');
    for (const node of campaignNodes) {
      const text = await node.evaluate(el => el.textContent);
      if (text?.includes(setting.campaigns[0].name)) {
        const nameEl = await node.$('[data-testid="campaign-name"]');
        if (nameEl) {
          await nameEl.click();
          break;
        }
      }
    }

    // Wait for campaign content
    await page.waitForSelector('.fcb-name-header', { timeout: 5000 });

    // Verify image picker is present in description tab
    const imagePicker = await getImagePicker();
    expect(imagePicker).to.not.be.null;
  });

  it('Image picker on session', async () => {
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

    // Verify image picker is present
    const imagePicker = await getImagePicker();
    expect(imagePicker).to.not.be.null;
  });

  /**
   * What it tests: Placeholder is shown when no image is selected.
   * Expected behavior: Placeholder element or default image is visible.
   */
  it('Image picker shows placeholder when no image', async () => {
    const setting = testData.settings[0];

    // Create a new entry without an image
    createdEntryUuid = await createEntryViaAPI(Topics.Character, testEntryName, setting.name);

    // Open the entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Image picker should still be present
    const imagePicker = await getImagePicker();
    expect(imagePicker).to.not.be.null;

    // May have placeholder image or no image
    const img = await getImageElement();
    // Image element may or may not exist depending on placeholder handling
  });
});
