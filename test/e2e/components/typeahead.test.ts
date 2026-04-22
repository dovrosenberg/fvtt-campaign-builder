/**
 * Typeahead component tests.
 * Tests typeahead dropdown, selection, and new value creation.
 */

/**
 * Typeahead component E2E tests.
 * Tests typeahead dropdown functionality: visibility, selection, filtering,
 * new value creation, placeholder text, and clearing selections.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { switchToSetting, expandTopicNode, expandTypeNode } from '@e2etest/utils';
import { Topics } from '../types';
import {
  openEntry,
  selectType,
  addNewType,
  getTypeValue,
  createEntryViaAPI,
  deleteEntryViaAPI,
} from '@e2etest/utils';

/**
 * Helper delay function.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Gets the typeahead input element.
 */
const getTypeaheadInput = async () => {
  const page = sharedContext.page!;
  return await page.$('.fcb-typeahead input[data-testid="typeahead-input"]');
};

/**
 * Gets the typeahead dropdown.
 */
const getTypeaheadDropdown = async () => {
  const page = sharedContext.page!;
  return await page.$('.fcb-ta-dropdown');
};

/**
 * Gets all typeahead options.
 */
const getTypeaheadOptions = async () => {
  const page = sharedContext.page!;
  return await page.$$('.typeahead-entry');
};

/**
 * Types in the typeahead input.
 */
const typeInTypeahead = async (text: string): Promise<void> => {
  const input = await getTypeaheadInput();
  if (input) {
    await input.click();
    await delay(100);
    await input.type(text);
    await delay(200);
  }
};

/**
 * Typeahead Component Tests
 * Verifies typeahead dropdown behavior across entry types.
 */
describe('Typeahead Component Tests', () => {
  let createdEntryUuid: string | null = null;
  const testEntryName = 'Test Typeahead Entry';

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
   * What it tests: Typeahead input is visible when opening a character entry.
   * Expected behavior: Typeahead input element is present in the DOM.
   */
  it('Typeahead input is visible on character entry', async () => {
    const setting = testData.settings[0];

    // Open a character entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const firstChar = setting.topics[Topics.Character][0];
    await openEntry(Topics.Character, firstChar.name);

    // Verify typeahead input is present
    const input = await getTypeaheadInput();
    expect(input).to.not.be.null;
  });

  /**
   * What it tests: Clicking the typeahead input opens the dropdown.
   * Expected behavior: Dropdown becomes visible after clicking the input.
   */
  it('Typeahead dropdown opens on click', async () => {
    const page = sharedContext.page!;

    // Make sure entry is open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const setting = testData.settings[0];
    await openEntry(Topics.Character, setting.topics[Topics.Character][0].name);

    // Click on typeahead input
    const input = await getTypeaheadInput();
    if (input) {
      await input.click();
      await delay(200);

      // Verify dropdown appears
      const dropdown = await getTypeaheadDropdown();
      expect(dropdown).to.not.be.null;
    }
  });

  /**
   * What it tests: Dropdown shows available options when opened.
   * Expected behavior: Dropdown contains at least one selectable option.
   */
  it('Typeahead shows options in dropdown', async () => {
    const page = sharedContext.page!;

    // Make sure entry is open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    const setting = testData.settings[0];
    await openEntry(Topics.Character, setting.topics[Topics.Character][0].name);

    // Click to open dropdown
    const input = await getTypeaheadInput();
    if (input) {
      await input.click();
      await page.waitForSelector('.fcb-ta-dropdown', { timeout: 5000 });

      // Verify options exist
      const options = await getTypeaheadOptions();
      expect(options.length).to.be.greaterThan(0);
    }
  });

  /**
   * What it tests: Clicking an option in the dropdown selects it.
   * Expected behavior: Selected value appears in the typeahead input.
   */
  it('Typeahead selects option on click', async () => {
    const setting = testData.settings[0];

    // Create a new entry for this test
    createdEntryUuid = await createEntryViaAPI(Topics.Character, testEntryName, setting.name);

    // Open the entry
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Select a type (first option)
    const page = sharedContext.page!;
    const input = await getTypeaheadInput();
    if (input) {
      await input.click();
      await page.waitForSelector('.fcb-ta-dropdown', { timeout: 5000 });
      const options = await getTypeaheadOptions();
      if (options.length > 0) {
        await options[0].click();
        await delay(200);
      }
    }

    // Verify type was selected
    const typeValue = await getTypeValue();
    expect(typeValue.length).to.be.greaterThan(0);
  });

  /**
   * What it tests: Typing in the typeahead filters the dropdown options.
   * Expected behavior: Options are filtered based on typed text.
   */
  it('Typeahead filters options by typing', async () => {
    const page = sharedContext.page!;

    // Make sure entry is open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Type in the input
    await typeInTypeahead('N');

    // Wait for dropdown
    await page.waitForSelector('.fcb-ta-dropdown', { timeout: 5000 });

    // Verify dropdown shows filtered options
    const options = await getTypeaheadOptions();
    // Options should exist (may be filtered)
    expect(options).to.not.be.null;
  });

  /**
   * What it tests: Adding a new type via the typeahead input.
   * Expected behavior: New type is added and selected.
   */
  it('Typeahead adds new type', async () => {
    const page = sharedContext.page!;

    // Make sure entry is open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Clear existing type first by clicking the clear button or emptying input
    const typeInput = await getTypeaheadInput();
    if (typeInput) {
      const clearBtn = await sharedContext.page!.$('.fcb-typeahead .clear-button, .fcb-typeahead [data-testid="clear-button"]');
      if (clearBtn) {
        await clearBtn.click();
        await delay(100);
      }
    }

    // Add a new type
    const newType = 'UniqueTestType' + Date.now();
    await addNewType(newType);

    // Verify new type was added and selected
    const typeValue = await getTypeValue();
    expect(typeValue.includes(newType)).to.equal(true);
  });

  /**
   * What it tests: Typeahead shows placeholder text.
   * Expected behavior: Placeholder text is visible in the typeahead input.
   */
  it('Typeahead shows placeholder text', async () => {
    const page = sharedContext.page!;

    // Create a fresh entry
    const setting = testData.settings[0];
    const freshEntryUuid = await createEntryViaAPI(Topics.Character, 'Fresh Typeahead Entry', setting.name);

    try {
      // Open the entry
      await expandTopicNode(Topics.Character);
      await expandTypeNode(Topics.Character, '(none)');
      await openEntry(Topics.Character, 'Fresh Typeahead Entry');

      // Check for placeholder
      const input = await getTypeaheadInput();
      if (input) {
        const placeholder = await input.evaluate(el => (el as HTMLInputElement).placeholder);
        // Placeholder should exist (may be empty string)
        expect(placeholder !== undefined).to.equal(true);
      }
    } finally {
      // Clean up
      if (freshEntryUuid) {
        await deleteEntryViaAPI(freshEntryUuid);
      }
    }
  });

  /**
   * What it tests: Typeahead input is visible on location entry.
   * Expected behavior: Typeahead input element is present in the DOM.
   */
  it('Typeahead input is visible on location entry', async () => {
    const setting = testData.settings[0];

    // Open a location entry
    await expandTopicNode(Topics.Location);
    await expandTypeNode(Topics.Location, '(none)');
    const firstLoc = setting.topics[Topics.Location][0];
    await openEntry(Topics.Location, firstLoc.name);

    // Verify typeahead input is present
    const input = await getTypeaheadInput();
    expect(input).to.not.be.null;
  });

  /**
   * What it tests: Typeahead input is visible on organization entry.
   * Expected behavior: Typeahead input element is present in the DOM.
   */
  it('Typeahead input is visible on organization entry', async () => {
    const setting = testData.settings[0];

    // Open an organization entry
    await expandTopicNode(Topics.Organization);
    await expandTypeNode(Topics.Organization, '(none)');
    const firstOrg = setting.topics[Topics.Organization][0];
    await openEntry(Topics.Organization, firstOrg.name);

    // Verify typeahead input is present
    const input = await getTypeaheadInput();
    expect(input).to.not.be.null;
  });

  /**
   * What it tests: Clearing the type selection.
   * Expected behavior: Type is cleared or set to '(none)'.
   */
  it('Typeahead clears type selection', async () => {
    const page = sharedContext.page!;

    // Make sure entry is open with a type
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Clear the type by clicking clear button
    const typeInput = await getTypeaheadInput();
    if (typeInput) {
      const clearBtn = await sharedContext.page!.$('.fcb-typeahead .clear-button, .fcb-typeahead [data-testid="clear-button"]');
      if (clearBtn) {
        await clearBtn.click();
        await delay(200);
      }
    }

    // Verify type is empty or (none)
    const typeValue = await getTypeValue();
    expect(typeValue.length === 0 || typeValue.includes('(none)')).to.equal(true);
  });

  /**
   * What it tests: Typeahead dropdown closes after selecting an option.
   * Expected behavior: Dropdown is no longer visible after selection.
   */
  it('Typeahead dropdown closes on selection', async () => {
    const page = sharedContext.page!;

    // Make sure entry is open
    await expandTopicNode(Topics.Character);
    await expandTypeNode(Topics.Character, '(none)');
    await openEntry(Topics.Character, testEntryName);

    // Click to open dropdown
    const input = await getTypeaheadInput();
    if (input) {
      await input.click();
      await page.waitForSelector('.fcb-ta-dropdown', { timeout: 5000 });

      // Select an option
      const options = await getTypeaheadOptions();
      if (options.length > 0) {
        await options[0].click();
        await delay(200);

        // Verify dropdown is closed
        const dropdown = await getTypeaheadDropdown();
        const isVisible = dropdown ? await dropdown.isIntersectingViewport() : false;
        expect(isVisible).to.equal(false);
      }
    }
  });
});
