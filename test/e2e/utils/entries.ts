/**
 * Test utilities for entry operations.
 */

import { sharedContext } from '../sharedContext';
import { Topics, ValidTopic } from '@/types';
import { getByTestId } from '../helpers';

const topicText: Record<ValidTopic, string> = {
  [Topics.Character]: 'Characters',
  [Topics.Location]: 'Locations',
  [Topics.Organization]: 'Organizations',
  [Topics.PC]: 'PCs',
};

/**
 * Helper delay function to replace deprecated page.waitForTimeout.
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Opens an entry from the directory tree.
 * Assumes the topic folder is already expanded.
 * Retries if entry not found (for newly created entries).
 * Uses page.evaluate to avoid stale element handle issues.
 */
export const openEntry = async (topic: ValidTopic, entryName: string, retries = 3): Promise<void> => {
  const page = sharedContext.page!;

  // Wait for entries to be visible within this topic folder
  // Entries can have different class names depending on state
  await page.waitForFunction((topicId: number) => {
    const topicFolder = document.querySelector(`.fcb-topic-folder[data-topic="${topicId}"]`);
    if (!topicFolder) return false;
    return topicFolder.querySelector('.fcb-directory-entry, .fcb-current-directory-entry, .fcb-current-directory-branch') !== null;
  }, { timeout: 5000 }, topic);

  // Use page.evaluate to find and click the entry directly
  // Search all entry class variants
  const clicked = await page.evaluate((topicId: number, name: string) => {
    const topicFolder = document.querySelector(`.fcb-topic-folder[data-topic="${topicId}"]`);
    if (!topicFolder) return false;

    const entries = Array.from(topicFolder.querySelectorAll('.fcb-directory-entry, .fcb-current-directory-entry, .fcb-current-directory-branch'));
    for (const entry of entries) {
      if (entry.textContent?.includes(name)) {
        (entry as HTMLElement).click();
        return true;
      }
    }
    return false;
  }, topic, entryName);

  if (!clicked) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return openEntry(topic, entryName, retries - 1);
    }
    // Debug: log all visible entry names in the topic folder
    const debugInfo = await page.evaluate((topicId: number) => {
      const topicFolder = document.querySelector(`.fcb-topic-folder[data-topic="${topicId}"]`);
      if (!topicFolder) return 'Topic folder not found';
      const entries = topicFolder.querySelectorAll('.fcb-directory-entry, .fcb-current-directory-entry, .fcb-current-directory-branch');
      const typeNodes = topicFolder.querySelectorAll('.fcb-directory-type');
      return {
        entryCount: entries.length,
        entryTexts: Array.from(entries).map(e => e.textContent?.trim()),
        typeCount: typeNodes.length,
        typeTexts: Array.from(typeNodes).map(t => t.textContent?.trim()),
        isCollapsed: topicFolder.classList.contains('collapsed'),
        html: topicFolder.innerHTML.substring(0, 500),
      };
    }, topic);
    throw new Error(`Entry not found: ${entryName}. Debug: ${JSON.stringify(debugInfo)}`);
  }

  // Wait for the content to load
  await page.waitForSelector('[data-testid="entry-name-input"]', { timeout: 5000 });
};

/**
 * Selector for the entry name input.
 */
export const getEntryNameInputSelector = (): string => {
  return getByTestId('entry-name-input');
};

/**
 * Selector for the type select input (first typeahead on description tab).
 * Note: Uses a more specific selector to find the type input within the TypeSelect component.
 */
export const getTypeSelectInputSelector = (): string => {
  // Type is the first typeahead in the description tab
  return '.fcb-description-content .fcb-typeahead input[data-testid="typeahead-input"]';
};

/**
 * Selector for the species select input (second typeahead on description tab, for characters).
 * Note: Species input is within the SpeciesSelect component wrapper.
 */
export const getSpeciesSelectInputSelector = (): string => {
  // Species is the second typeahead in the description tab (after type)
  return '.fcb-description-content .fcb-typeahead:nth-child(2) input[data-testid="typeahead-input"]';
};

/**
 * Selector for the tags input.
 */
export const getTagsInputSelector = (): string => {
  return getByTestId('tags-input');
};

/**
 * Selector for the push to session button.
 * Returns null if button doesn't exist.
 */
export const getPushToSessionButtonSelector = async (): Promise<string | null> => {
  const page = sharedContext.page!;
  const btn = await page.$('[data-testid="entry-push-to-session-button"]');
  if (!btn) return null;
  return getByTestId('entry-push-to-session-button');
};

/**
 * Selector for the generate button.
 * Returns null if button doesn't exist.
 */
export const getGenerateButtonSelector = async (): Promise<string | null> => {
  const page = sharedContext.page!;
  const btn = await page.$('[data-testid="entry-generate-button"]');
  if (!btn) return null;
  return getByTestId('entry-generate-button');
};

/**
 * Selector for the foundry doc button.
 * Returns null if button doesn't exist.
 */
export const getFoundryDocButtonSelector = async (): Promise<string | null> => {
  const page = sharedContext.page!;
  const btn = await page.$('[data-testid="entry-foundry-doc-button"]');
  if (!btn) return null;
  return getByTestId('entry-foundry-doc-button');
};

/**
 * Selector for the voice button.
 */
export const getVoiceButtonSelector = (): string => {
  return getByTestId('entry-voice-button');
};

/**
 * Clicks on a tab in the content tab strip.
 * Uses page.evaluate to avoid stale element handle issues.
 */
export const clickContentTab = async (tabId: string): Promise<void> => {
  const page = sharedContext.page!;

  // Use page.evaluate to click the tab button directly in the browser context
  // Target the tab button (class "item") specifically, not the tab content (class "tab")
  await page.evaluate((id: string) => {
    const tab = document.querySelector(`.item[data-tab="${id}"]`);
    if (tab && tab instanceof HTMLElement) {
      tab.click();
    }
  }, tabId);

  // Wait for tab content to be visible
  await page.waitForSelector(`.tab[data-tab="${tabId}"]`, { visible: true, timeout: 5000 }).catch(() => {});
};

/**
 * Creates a new entry via the UI (context menu -> create dialog).
 * This simulates real user behavior and ensures the UI updates properly.
 * 
 * @param topic The topic for the entry
 * @param name The name for the new entry
 * @returns The UUID of the created entry
 */
export const createEntryViaUI = async (topic: ValidTopic, name: string): Promise<string> => {
  const page = sharedContext.page!;

  // Right-click on the topic folder header to trigger context menu
  await page.evaluate((topicId: number) => {
    const topicFolder = document.querySelector(`.fcb-topic-folder[data-topic="${topicId}"]`);
    if (!topicFolder) throw new Error(`Topic folder not found for topic: ${topicId}`);
    const headerInner = topicFolder.querySelector('.folder-header > div');
    if (!headerInner) throw new Error(`Topic folder header inner div not found for topic: ${topicId}`);
    headerInner.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
  }, topic);

  // Wait for context menu
  await page.waitForSelector('.mx-context-menu', { timeout: 5000 });

  // Find and click the "Create new X" menu item
  const createLabels: Record<ValidTopic, string> = {
    [Topics.Character]: 'Create new character',
    [Topics.Location]: 'Create new location',
    [Topics.Organization]: 'Create new organization',
    [Topics.PC]: 'Create new PC',
  };
  const createLabel = createLabels[topic];
  await page.evaluate((label: string) => {
    const items = Array.from(document.querySelectorAll('.mx-context-menu-item'));
    for (const item of items) {
      if (item.textContent?.includes(label)) {
        (item as HTMLElement).click();
        return;
      }
    }
  }, createLabel);

  // Wait for dialog to appear
  await page.waitForSelector('.fcb-dialog', { timeout: 5000 });

  // Type the entry name into the dialog input
  const nameInput = await page.$('.fcb-dialog input[type="text"]');
  if (!nameInput) {
    throw new Error('Name input not found in create entry dialog');
  }
  await nameInput.click({ clickCount: 3 });
  await nameInput.type(name);

  // Click the Use/OK button to create the entry
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.fcb-dialog-button'));
    for (const btn of buttons) {
      if (btn.textContent?.includes('Use') || btn.textContent?.includes('OK')) {
        (btn as HTMLElement).click();
        return;
      }
    }
    // Fallback: click primary button
    const primaryBtn = document.querySelector('.fcb-dialog-button.primary') as HTMLElement;
    if (primaryBtn) primaryBtn.click();
  });

  // Wait for dialog to close
  await page.waitForSelector('.fcb-dialog', { hidden: true, timeout: 5000 });

  // Wait for the newly created entry to be active (name input shows the created entry's name)
  await page.waitForFunction((entryName: string) => {
    const input = document.querySelector('[data-testid="entry-name-input"]') as HTMLInputElement;
    return input && input.value === entryName;
  }, { timeout: 5000 }, name);

  // Small delay for Vue reactivity to settle
  await delay(200);

  // Get the UUID from the currently open entry tab
  // The entry opens automatically after creation via the dialog callback
  // Use page.evaluate to get a fresh reference to avoid stale element issues
  const uuid = await page.evaluate(() => {
    // Get from the open tab
    const activeTab = document.querySelector('.fcb-tab.active');
    if (activeTab) {
      return activeTab.getAttribute('data-uuid');
    }
    return null;
  });

  if (uuid) {
    return uuid;
  }

  // Fallback: look up by name via API (with retry for timing)
  for (let retry = 0; retry < 3; retry++) {
    const fallbackUuid = await page.evaluate(async (entryName: string, topicId: number) => {
      const api = (game as any).modules.get('campaign-builder')!.api;
      const list = api.getEntries(topicId);
      const entry = list.find((e: { name: string }) => e.name === entryName);
      return entry?.uuid;
    }, name, topic);
    
    if (fallbackUuid) {
      return fallbackUuid;
    }
    
    // Wait a bit before retrying
    await delay(300);
  }

  throw new Error(`Could not find UUID for created entry: ${name}`);
};

/**
 * Creates a new entry via the API (for test setup only - prefer createEntryViaUI for tests).
 */
export const createEntryViaAPI = async (
  topic: ValidTopic,
  name: string,
  settingName: string
): Promise<string> => {
  const page = sharedContext.page!;

  const uuid = await page.evaluate(
    async ({ topic, name, settingName }: { topic: ValidTopic; name: string; settingName: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      return await api.createEntry(topic, name, settingName);
    },
    { topic, name, settingName }
  );

  return uuid;
};

/**
 * Deletes an entry via the API (for test cleanup).
 */
export const deleteEntryViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    await api.deleteEntry(uuid);
  }, uuid);
};

/**
 * Gets the current entry name value.
 */
export const getEntryNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  const selector = getEntryNameInputSelector();
  return await page.$eval(selector, (el) => (el as HTMLInputElement).value);
};

/**
 * Sets the entry name (types into the input).
 */
export const setEntryName = async (name: string): Promise<void> => {
  const page = sharedContext.page!;
  const selector = getEntryNameInputSelector();
  // Clear and type
  await page.$eval(selector, (el) => { (el as HTMLInputElement).value = ''; });
  await page.type(selector, name);
  // Wait for debounce (500ms) plus a buffer
  await delay(700);
};

/**
 * Clears the type selection.
 */
export const clearType = async (): Promise<void> => {
  const page = sharedContext.page!;
  const selector = getTypeSelectInputSelector();
  await page.click(selector);
  await page.$eval(selector, (el) => { (el as HTMLInputElement).value = ''; });
  // Wait for dropdown to close
  await page.waitForSelector('.fcb-ta-dropdown', { hidden: true, timeout: 2000 }).catch(() => {});
};

/**
 * Gets the current type value.
 */
export const getTypeValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  // Get the first typeahead input value
  const input = await page.$('.fcb-typeahead input[data-testid="typeahead-input"]');
  if (!input) return '';
  return await input.evaluate(el => (el as HTMLInputElement).value);
};

/**
 * Selects a type from the type dropdown.
 */
export const selectType = async (typeName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Click on the type input to open dropdown
  await page.click(getTypeSelectInputSelector());

  // Wait for dropdown to appear
  await page.waitForSelector('.fcb-ta-dropdown');

  // Find and click the option
  const options = await page.$$('.typeahead-entry');
  for (const option of options) {
    const text = await option.evaluate(el => el.textContent);
    if (text?.includes(typeName)) {
      await option.click();
      break;
    }
  }

  // Wait for dropdown to close (indicates selection was processed)
  await page.waitForSelector('.fcb-ta-dropdown', { hidden: true, timeout: 2000 }).catch(() => {});
};

/**
 * Adds a new type via the typeahead.
 */
export const addNewType = async (typeName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Click on the type input and clear any existing value
  const selector = getTypeSelectInputSelector();
  await page.click(selector);
  await page.$eval(selector, (el) => { (el as HTMLInputElement).value = ''; });
  await page.type(selector, typeName);

  // Wait for dropdown to appear
  await page.waitForSelector('.fcb-ta-dropdown');

  // Click the add option
  const addOption = await page.$('[data-testid="typeahead-add-option"]');
  if (addOption) {
    await addOption.click();
  }

  // Wait for dropdown to close (indicates selection was processed)
  await page.waitForSelector('.fcb-ta-dropdown', { hidden: true, timeout: 2000 }).catch(() => {});
};

/**
 * Gets the current species value.
 */
export const getSpeciesValue = async (): Promise<string> => {
  const page = sharedContext.page!;
  // Get all typeahead inputs and return the second one (species)
  const inputs = await page.$$('.fcb-typeahead input[data-testid="typeahead-input"]');
  if (inputs.length < 2) return '';
  return await inputs[1].evaluate(el => (el as HTMLInputElement).value);
};

/**
 * Selects a species from the dropdown.
 */
export const selectSpecies = async (speciesName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Click on the species input to open dropdown
  await page.click(getSpeciesSelectInputSelector());

  // Wait for dropdown to appear
  await page.waitForSelector('.fcb-ta-dropdown');

  // Find and click the option
  const options = await page.$$('.typeahead-entry');
  for (const option of options) {
    const text = await option.evaluate(el => el.textContent);
    if (text?.includes(speciesName)) {
      await option.click();
      break;
    }
  }

  // Wait for dropdown to close (indicates selection was processed)
  await page.waitForSelector('.fcb-ta-dropdown', { hidden: true, timeout: 2000 }).catch(() => {});
};

/**
 * Adds a tag to the entry.
 * Uses page.evaluate to avoid stale element handle issues.
 */
export const addTag = async (tagName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Wait for tags component to be initialized (class is removed when ready)
  await page.waitForFunction(() => {
    const wrapper = document.querySelector('.tags-wrapper');
    return wrapper && !wrapper.classList.contains('uninitialized');
  }, { timeout: 5000 });

  // Use page.evaluate to interact with tagify directly in browser context
  await page.evaluate((name: string) => {
    const tagsInput = document.querySelector('.tagify__input') as HTMLElement;
    if (tagsInput) {
      tagsInput.focus();
      // Tagify uses contentEditable or input
      if (tagsInput.isContentEditable) {
        tagsInput.textContent = name;
        tagsInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      } else if ('value' in tagsInput) {
        (tagsInput as HTMLInputElement).value = name;
        tagsInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    }
  }, tagName);

  // Wait for the tag to appear in the DOM
  await page.waitForFunction((name: string) => {
    const tags = document.querySelectorAll('.tagify__tag');
    return Array.from(tags).some(tag => tag.textContent?.includes(name));
  }, { timeout: 3000 }, tagName);
};

/**
 * Removes a tag from the entry.
 * Uses page.evaluate to avoid stale element handle issues.
 */
export const removeTag = async (tagName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Use page.evaluate to find and click the remove button directly
  await page.evaluate((name: string) => {
    const tags = Array.from(document.querySelectorAll('.tagify__tag'));
    for (const tag of tags) {
      if (tag.textContent?.includes(name)) {
        // Tagify uses an 'x' button inside the tag
        const removeBtn = tag.querySelector('tag-remove, .tagify__tag__removeBtn') as HTMLElement;
        if (removeBtn) {
          removeBtn.click();
        } else {
          // Alternative: click the tag itself to trigger removal
          (tag as HTMLElement).click();
        }
        break;
      }
    }
  }, tagName);

  // Wait for the tag to be removed from the DOM
  await page.waitForFunction((name: string) => {
    const tags = document.querySelectorAll('.tagify__tag');
    return !Array.from(tags).some(tag => tag.textContent?.includes(name));
  }, { timeout: 3000 }, tagName);
};

/**
 * Clicks a tag to open tag results.
 * Uses page.evaluate to avoid stale element handle issues.
 */
export const clickTag = async (tagName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Wait for tags component to be initialized
  await page.waitForFunction(() => {
    const wrapper = document.querySelector('.tags-wrapper');
    return wrapper && !wrapper.classList.contains('uninitialized');
  }, { timeout: 5000 });

  // Use page.evaluate to find and click the tag directly
  await page.evaluate((name: string) => {
    const tags = Array.from(document.querySelectorAll('.tagify__tag'));
    for (const tag of tags) {
      if (tag.textContent?.includes(name)) {
        (tag as HTMLElement).click();
        break;
      }
    }
  }, tagName);

  // Wait for a new tab to appear (tag results tab)
  await page.waitForSelector('.fcb-tab.active', { timeout: 5000 }).catch(() => {});
};

/**
 * Closes the active tab by clicking its close button.
 */
export const closeActiveTab = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Get tab count and click close button in a single evaluate
  const tabCount = await page.evaluate(() => {
    const closeBtn = document.querySelector('.fcb-tab.active [data-testid="tab-close-button"]') as HTMLElement;
    const count = document.querySelectorAll('.fcb-tab').length;
    if (closeBtn) closeBtn.click();
    return count;
  });

  if (tabCount > 0) {
    // Wait for tab count to decrease
    await page.waitForFunction((count: number) => {
      return document.querySelectorAll('.fcb-tab').length < count;
    }, { timeout: 3000 }, tabCount).catch(() => {});
  }
};

/**
 * Closes the tab with the given name.
 */
export const closeTabByName = async (tabName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find and close the tab in browser context to avoid stale handles
  await page.evaluate((name: string) => {
    const tabs = Array.from(document.querySelectorAll('.fcb-tab'));
    for (const tab of tabs) {
      if (tab.textContent?.includes(name)) {
        const closeBtn = tab.querySelector('[data-testid="tab-close-button"]') as HTMLElement;
        if (closeBtn) closeBtn.click();
        break;
      }
    }
  }, tabName);

  // Wait for tab to be removed
  await page.waitForFunction((name: string) => {
    const allTabs = document.querySelectorAll('.fcb-tab');
    return !Array.from(allTabs).some(t => t.textContent?.includes(name));
  }, { timeout: 3000 }, tabName).catch(() => {});
};

/**
 * Selector for the parent typeahead input.
 */
export const getParentInputSelector = (): string => {
  return getByTestId('typeahead-input');
};

/**
 * Selects a parent for the entry.
 */
export const selectParent = async (parentName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the parent input (it's the last typeahead-input on the description tab)
  const inputs = await page.$$('.fcb-typeahead input[data-testid="typeahead-input"]');
  // The parent input should be the last one after type and species
  const parentInput = inputs[inputs.length - 1];
  if (parentInput) {
    await parentInput.click();
    await parentInput.type(parentName);

    // Wait for dropdown
    await page.waitForSelector('.fcb-ta-dropdown');

    // Click the matching option
    const options = await page.$$('.typeahead-entry');
    for (const option of options) {
      const text = await option.evaluate(el => el.textContent);
      if (text?.includes(parentName)) {
        await option.click();
        break;
      }
    }

    // Wait for dropdown to close
    await page.waitForSelector('.fcb-ta-dropdown', { hidden: true, timeout: 2000 }).catch(() => {});
  }
};

/**
 * Clicks the push to session button.
 * Returns true if successful, false if button not found or disabled.
 */
export const clickPushToSession = async (): Promise<boolean> => {
  const page = sharedContext.page!;
  const selector = await getPushToSessionButtonSelector();
  if (!selector) return false;

  const isDisabled = await page.$eval(selector, (el) => (el as HTMLButtonElement).disabled);
  if (isDisabled) return false;

  await page.click(selector);
  return true;
};

/**
 * Clicks a context menu item by label.
 */
export const clickContextMenuItem = async (label: string): Promise<void> => {
  const page = sharedContext.page!;

  // Wait for context menu to appear
  await page.waitForSelector('.mx-context-menu');

  // Use page.evaluate to find and click the menu item
  await page.evaluate((menuLabel: string) => {
    const items = Array.from(document.querySelectorAll('.mx-context-menu-item'));
    for (const item of items) {
      if (item.textContent?.includes(menuLabel)) {
        (item as HTMLElement).click();
        break;
      }
    }
  }, label);

  // Wait for context menu to close
  await page.waitForSelector('.mx-context-menu', { hidden: true, timeout: 2000 }).catch(() => {});
};

/**
 * Selector for the player name input (for PCs).
 */
export const getPlayerNameInputSelector = (): string => {
  return '.fcb-input-name';
};

/**
 * Sets the player name (for PCs).
 */
export const setPlayerName = async (name: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the player name input (it's the second input after the PC name which is disabled)
  const inputs = await page.$$('.fcb-description-content .fcb-input-name');
  if (inputs.length > 0) {
    await inputs[0].click();
    await inputs[0].evaluate((el, name) => { (el as HTMLInputElement).value = name; }, name);
    await inputs[0].type(''); // Trigger input event
    // Wait for debounce
    await delay(700);
  }
};

/**
 * Gets the current player name value.
 */
export const getPlayerNameValue = async (): Promise<string> => {
  const page = sharedContext.page!;

  const inputs = await page.$$('.fcb-description-content .fcb-input-name');
  if (inputs.length > 0) {
    return await inputs[0].evaluate(el => (el as HTMLInputElement).value);
  }
  return '';
};



////////////////////
// Editor utilities
////////////////////

/**
 * Gets the description editor content.
 * Uses page.evaluate to access ProseMirror editor state.
 */
export const getDescriptionEditorContent = async (): Promise<string> => {
  const page = sharedContext.page!;

  return await page.evaluate(() => {
    const editorEl = document.querySelector('.ProseMirror');
    if (!editorEl) return '';
    return editorEl.innerHTML;
  });
};

/**
 * Sets the description editor content.
 * Uses page.evaluate to directly manipulate ProseMirror editor state.
 */
export const setDescriptionEditorContent = async (content: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate((html: string) => {
    const editorEl = document.querySelector('.ProseMirror');
    if (!editorEl) return;

    // Create a temporary div to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Dispatch a transaction to replace content
    const view = (editorEl as any).__vue__?.$proseMirrorView;
    if (view) {
      const { EditorState, PluginKey } = (window as any).ProseMirror;
      const { DOMParser } = (window as any).ProseMirror.model;
      const doc = DOMParser.fromSchema(view.state.schema).parse(temp);
      view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content));
    } else {
      // Fallback: just set innerHTML
      editorEl.innerHTML = html;
    }
  }, content);
};

/**
 * Triggers a save on the description editor (Ctrl+S).
 */
export const saveDescriptionEditor = async (): Promise<void> => {
  const page = sharedContext.page!;

  // Focus the editor first
  await page.click('.ProseMirror');

  // Trigger save with Ctrl+S
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');

  // Wait for save debounce
  await delay(500);
};

/**
 * Gets the editor's dirty state.
 */
export const isEditorDirty = async (): Promise<boolean> => {
  const page = sharedContext.page!;

  return await page.evaluate(() => {
    const editorEl = document.querySelector('.ProseMirror');
    if (!editorEl) return false;

    const vueComponent = (editorEl as any).__vue__;
    return vueComponent?.isDirty?.() || false;
  });
};

////////////////////
// Journal utilities
////////////////////

/**
 * Clicks the add journal button to show the picker.
 */
export const clickAddJournalButton = async (): Promise<void> => {
  const page = sharedContext.page!;

  const addBtn = await page.$('[data-testid="journals-table"] .fcb-table-add-button');
  if (addBtn) {
    await addBtn.click();
    // Wait for dialog to appear
    await page.waitForSelector('.related-documents-dialog', { timeout: 5000 }).catch(() => {});
  }
};

/**
 * Adds a journal via the picker dialog.
 * @param journalName The name of the journal to add
 */
export const addJournalViaPicker = async (journalName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Open the picker
  await clickAddJournalButton();

  // Wait for dialog
  await page.waitForSelector('.related-documents-dialog');

  // Find and click the journal
  const rows = await page.$$('.related-documents-dialog .fcb-table-row');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(journalName)) {
      await row.click();
      break;
    }
  }

  // Wait for dialog to close
  await page.waitForSelector('.related-documents-dialog', { hidden: true, timeout: 3000 }).catch(() => {});
};

/**
 * Removes a journal by clicking its delete button.
 * @param journalName The name of the journal to remove
 */
export const removeJournal = async (journalName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find the row with the journal name
  const rows = await page.$$('[data-testid="journals-table"] tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(journalName)) {
      // Click the delete button in this row
      const deleteBtn = await row.$('.fa-trash');
      if (deleteBtn) {
        await deleteBtn.click();

        // Confirm the deletion dialog if it appears
        await page.waitForSelector('.fcb-dialog', { timeout: 2000 }).catch(() => {});
        const confirmBtn = await page.$('.fcb-dialog-button.default');
        if (confirmBtn) {
          await confirmBtn.click();
          // Wait for confirm dialog to close
          await page.waitForSelector('.fcb-dialog', { hidden: true, timeout: 3000 }).catch(() => {});
        }
      }
      break;
    }
  }
};

/**
 * Clicks a journal row to open the journal sheet.
 * @param journalName The name of the journal to click
 */
export const clickJournalRow = async (journalName: string): Promise<void> => {
  const page = sharedContext.page!;

  const rows = await page.$$('[data-testid="journals-table"] tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(journalName)) {
      // Click the journal name cell (second column)
      const cells = await row.$$('td');
      if (cells.length >= 2) {
        await cells[1].click();
      }
      break;
    }
  }

  // Wait for journal sheet to open
  await page.waitForSelector('.journal-sheet, .sheet', { timeout: 5000 }).catch(() => {});
};

/**
 * Gets the count of journals in the journals tab, excluding empty-state rows.
 */
export const getJournalCount = async (): Promise<number> => {
  return await getTableRowCount('[data-testid="journals-table"] tbody tr');
};

////////////////////
// Drag-drop utilities
////////////////////

/**
 * Simulates a drag-drop operation using page.evaluate.
 * @param sourceUuid The UUID of the dragged item
 * @param sourceType The document type (JournalEntry, Actor, etc.)
 * @param targetSelector CSS selector for the drop target
 */
export const simulateDragDrop = async (
  sourceUuid: string,
  sourceType: string,
  targetSelector: string
): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(
    ({ sourceUuid, sourceType, targetSelector }: { sourceUuid: string; sourceType: string; targetSelector: string }) => {
      const target = document.querySelector(targetSelector);
      if (!target) return;

      const dragData = JSON.stringify({
        type: sourceType,
        uuid: sourceUuid,
      });

      // Build a mock dataTransfer - Chrome restricts getData() on synthetic DragEvents,
      // so we use a plain object that the drop handler can read directly.
      const mockDataTransfer = {
        types: ['text/plain'],
        getData(format: string) {
          return format === 'text/plain' ? dragData : '';
        },
        setData() {},
        dropEffect: 'none' as const,
        effectAllowed: 'all' as const,
        files: {} as FileList,
        items: {} as DataTransferItemList,
        clearData() {},
      };

      // Dispatch as a CustomEvent but with dataTransfer attached directly,
      // since the handler only reads event.dataTransfer (not instanceof DragEvent).
      const dropEvent = new CustomEvent('drop', { bubbles: true, cancelable: true }) as unknown as DragEvent;
      (dropEvent as any).dataTransfer = mockDataTransfer;

      target.dispatchEvent(dropEvent);
    },
    { sourceUuid, sourceType, targetSelector }
  );
};

/**
 * Standardized helper for testing drag-drop addition of documents to tabs.
 * Creates a document (if needed), drops it on a tab, and verifies it appears in the table.
 *
 * @param options Configuration options for the drag-drop test
 * @param options.tabId The tab to switch to (e.g., 'actors', 'journals', 'characters', 'foundry')
 * @param options.documentType The Foundry document type (e.g., 'Actor', 'JournalEntry', 'JournalEntryPage')
 * @param options.dropSelector CSS selector for the drop target
 * @param options.tableSelector CSS selector for the table (used for verification, defaults to dropSelector without drop-box class)
 * @param options.documentName Optional name to use when creating a new document
 * @param options.documentUuid Optional existing UUID to drop (if not creating a new document)
 * @param options.createDocumentFn Optional function to create a document via API (returns UUID)
 * @param options.verifyByText Whether to verify by text content (true) or row count (false). Default: true
 * @returns The UUID of the document that was dropped
 */
export const addDocumentViaDragDrop = async (options: {
  tabId: string;
  documentType: string;
  dropSelector: string;
  tableSelector?: string;
  documentName?: string;
  documentUuid?: string;
  createDocumentFn?: () => Promise<string>;
  verifyByText?: boolean;
}): Promise<string> => {
  const page = sharedContext.page!;
  const {
    tabId,
    documentType,
    dropSelector,
    tableSelector,
    documentName,
    documentUuid,
    createDocumentFn,
    verifyByText = true,
  } = options;

  // Switch to the target tab
  await clickContentTab(tabId);
  await page.waitForSelector(`.tab[data-tab="${tabId}"].active`, { timeout: 5000 });

  // Get the UUID to drop (either provided or create new)
  let uuidToDrop = documentUuid;
  if (!uuidToDrop && createDocumentFn) {
    uuidToDrop = await createDocumentFn();
  }

  if (!uuidToDrop) {
    throw new Error('Either documentUuid or createDocumentFn must be provided');
  }

  // Simulate dropping the document
  await simulateDragDrop(uuidToDrop, documentType, dropSelector);

  // Wait for Vue to process the drop
  await delay(1000);

  // Verify the document appears in the table
  if (verifyByText && documentName) {
    // Use tableSelector if provided, otherwise extract table selector from dropSelector
    const selector = tableSelector || dropSelector.replace(/ \.fcb-table-new-drop-box$/, '');
    await page.waitForFunction((docName: string, sel: string) => {
      const cells = document.querySelectorAll(`${sel} tbody td`);
      for (const cell of cells) {
        if (cell.textContent && cell.textContent.includes(docName)) {
          return true;
        }
      }
      return false;
    }, { timeout: 10000 }, documentName, selector);
  }

  return uuidToDrop;
};

/**
 * Simulates dropping a journal onto the journals tab.
 * @param journalUuid The UUID of the journal to drop
 */
export const dropJournalOnJournalsTab = async (journalUuid: string): Promise<void> => {
  await simulateDragDrop(journalUuid, 'JournalEntry', '[data-testid="journals-table"]');
};

/**
 * Simulates dropping an actor onto a PC (for PC tests).
 * @param actorUuid The UUID of the actor to drop
 */
export const dropActorOnPC = async (actorUuid: string): Promise<void> => {
  await simulateDragDrop(actorUuid, 'Actor', '.fcb-pc-image-container');
};

////////////////////
// Related entries utilities
////////////////////

/**
 * Adds a relationship via drag-drop.
 * @param entryUuid The UUID of the entry to add
 * @param tabId The relationship tab (characters, locations, organizations, pcs)
 */
export const dropEntryOnRelationshipTab = async (entryUuid: string, tabId: string): Promise<void> => {
  // Switch to the relationship tab first
  await clickContentTab(tabId);

  await simulateDragDrop(entryUuid, 'JournalEntryPage', `[data-testid="${tabId}-table"]`);
};

/**
 * Checks if a table row is an empty-state row (e.g., "Nothing here" text).
 * @param row The row element handle to check
 * @returns True if the row contains only empty-state text
 */
const isEmptyStateRow = async (row: import('puppeteer').ElementHandle<Element>): Promise<boolean> => {
  const text = await row.evaluate(el => el.textContent?.trim() || '');
  // Filter out rows that only contain empty-state indicators like "Nothing here"
  return text.toLowerCase() === 'nothing here' || text === '';
};

/**
 * Gets the count of real data rows in a table, excluding empty-state rows.
 * @param selector CSS selector for the table rows (e.g., '[data-testid="actors-table"] tbody tr')
 */
export const getTableRowCount = async (selector: string): Promise<number> => {
  const page = sharedContext.page!;

  const rows = await page.$$(selector);
  let count = 0;
  for (const row of rows) {
    const isEmpty = await isEmptyStateRow(row);
    if (!isEmpty) {
      count++;
    }
  }
  return count;
};

/**
 * Checks if a table contains a row with the given name in any cell.
 * @param tableSelector CSS selector for the table (e.g., '[data-testid="actors-table"]')
 * @param name The name to search for in table cells
 */
export const hasTableRowWithName = async (tableSelector: string, name: string): Promise<boolean> => {
  const page = sharedContext.page!;

  return await page.evaluate(({ tableSelector, name }: { tableSelector: string; name: string }) => {
    const cells = document.querySelectorAll(`${tableSelector} tbody td`);
    for (const cell of cells) {
      if (cell.textContent && cell.textContent.includes(name)) {
        return true;
      }
    }
    return false;
  }, { tableSelector, name });
};

/**
 * Gets the count of related entries in a relationship tab, excluding empty-state rows.
 */
export const getRelatedEntryCount = async (tabName?: string): Promise<number> => {
  // If a tab name is provided, scope to that specific table; otherwise use the active relationship tab
  const selector = tabName
    ? `[data-testid="${tabName}-table"] tbody tr`
    : '.tab.active [data-testid$="-table"] tbody tr';
  return await getTableRowCount(selector);
};

/**
 * Removes a related entry by clicking its delete button.
 * @param entryName The name of the entry to remove
 */
export const removeRelatedEntry = async (entryName: string): Promise<void> => {
  const page = sharedContext.page!;

  const rows = await page.$$('[data-testid$="-table"] tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(entryName)) {
      const deleteBtn = await row.$('.fa-trash');
      if (deleteBtn) {
        await deleteBtn.click();

        // Confirm the deletion dialog
        await page.waitForSelector('.fcb-dialog', { timeout: 2000 }).catch(() => {});
        const confirmBtn = await page.$('.fcb-dialog-button.default');
        if (confirmBtn) {
          await confirmBtn.click();
          // Wait for confirm dialog to close
          await page.waitForSelector('.fcb-dialog', { hidden: true, timeout: 3000 }).catch(() => {});
        }
      }
      break;
    }
  }
};

////////////////////
// Related documents utilities (actors/scenes)
////////////////////

/**
 * Gets the count of actors in the actors tab, excluding empty-state rows.
 */
export const getActorCount = async (): Promise<number> => {
  return await getTableRowCount('[data-testid="actors-table"] tbody tr');
};

/**
 * Gets the count of Foundry documents in the foundry tab, excluding empty-state rows.
 */
export const getFoundryDocCount = async (): Promise<number> => {
  return await getTableRowCount('[data-testid="foundry-table"] tbody tr');
};

/**
 * Gets the count of related documents in a documents tab, excluding empty-state rows.
 */
export const getRelatedDocumentCount = async (): Promise<number> => {
  const page = sharedContext.page!;

  // Count rows across all document tables, filtering empty-state rows
  const foundryCount = await getTableRowCount('[data-testid="foundry-table"] tbody tr');
  const scenesCount = await getTableRowCount('[data-testid="scenes-table"] tbody tr');
  const actorsCount = await getTableRowCount('[data-testid="actors-table"] tbody tr');
  return foundryCount + scenesCount + actorsCount;
};

/**
 * Clicks a document row to open it.
 * @param docName The name of the document to click
 */
export const clickDocumentRow = async (docName: string): Promise<void> => {
  const page = sharedContext.page!;

  const rows = await page.$$('[data-testid="foundry-table"] tbody tr, [data-testid="scenes-table"] tbody tr, [data-testid="actors-table"] tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(docName)) {
      // Click the name cell
      const cells = await row.$$('td');
      if (cells.length >= 2) {
        await cells[1].click();
      }
      break;
    }
  }

  // Wait for document sheet to open
  await page.waitForSelector('.sheet', { timeout: 5000 }).catch(() => {});
};

////////////////////
// Sessions tab utilities
////////////////////

/**
 * Gets the count of sessions in the sessions tab, excluding empty-state rows.
 */
export const getSessionCount = async (): Promise<number> => {
  return await getTableRowCount('[data-testid="sessions-table"] tbody tr');
};

/**
 * Clicks a session row to open the session.
 * @param sessionName The name of the session to click
 */
export const clickSessionRow = async (sessionName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Find and click the clickable name cell within the session row
  // The name column uses col.onClick rendered as .fcb-table-body-text.clickable inside the td
  const rows = await page.$$('[data-testid="sessions-table"] tbody tr');
  for (const row of rows) {
    const text = await row.evaluate(el => el.textContent);
    if (text?.includes(sessionName)) {
      // Click the inner clickable div rather than the td to trigger col.onClick
      const clickable = await row.$('.fcb-table-body-text.clickable');
      if (clickable) {
        await clickable.click();
      } else {
        // Fallback: click the td containing the session name text
        const cells = await row.$$('td');
        for (const cell of cells) {
          const cellText = await cell.evaluate(el => el.textContent?.trim());
          if (cellText === sessionName) {
            await cell.click();
            break;
          }
        }
      }
      break;
    }
  }
};

////////////////////
// Hierarchy utilities
////////////////////

/**
 * Gets the current parent value.
 */
export const getParentValue = async (): Promise<string> => {
  const page = sharedContext.page!;

  // Find the parent typeahead input
  const inputs = await page.$$('.fcb-typeahead input[data-testid="typeahead-input"]');
  // Parent is typically the last typeahead on the description tab
  if (inputs.length > 0) {
    const lastInput = inputs[inputs.length - 1];
    return await lastInput.evaluate(el => (el as HTMLInputElement).value);
  }
  return '';
};

/**
 * Gets the parent selector dropdown options.
 */
export const getParentOptions = async (): Promise<string[]> => {
  const page = sharedContext.page!;

  // Find the parent typeahead and click to open dropdown
  const inputs = await page.$$('.fcb-typeahead input[data-testid="typeahead-input"]');
  if (inputs.length === 0) return [];

  const parentInput = inputs[inputs.length - 1];
  await parentInput.click();

  // Wait for dropdown
  await page.waitForSelector('.fcb-ta-dropdown');

  // Get all options
  const options = await page.$$('.typeahead-entry');
  const optionTexts: string[] = [];

  for (const option of options) {
    const text = await option.evaluate(el => el.textContent);
    if (text) {
      optionTexts.push(text.trim());
    }
  }

  // Close dropdown by clicking elsewhere
  await page.evaluate(() => document.body.click());

  return optionTexts;
};

////////////////////
// Image utilities
////////////////////

/**
 * Gets the image picker element.
 */
export const getImagePicker = async (): Promise<import('puppeteer').ElementHandle<Element> | null> => {
  const page = sharedContext.page!;
  return await page.$('[data-testid="image-picker"]');
};

/**
 * Clicks the image picker to open file picker.
 */
export const clickImagePicker = async (): Promise<void> => {
  const page = sharedContext.page!;

  const imagePicker = await page.$('[data-testid="image-picker"] img, [data-testid="image-picker"]');
  if (imagePicker) {
    await imagePicker.click();
    // Wait for file input to be triggered (no visible change to wait for)
  }
};

/**
 * Gets the image URL from the image picker.
 */
export const getImageUrl = async (): Promise<string> => {
  const page = sharedContext.page!;

  const img = await page.$('[data-testid="image-picker"] img');
  if (img) {
    return await img.evaluate(el => (el as HTMLImageElement).src);
  }
  return '';
};

////////////////////
// Scene utilities (for locations)
////////////////////

/**
 * Gets the scenes count in the scenes tab.
 */
export const getSceneCount = async (): Promise<number> => {
  const page = sharedContext.page!;

  // Switch to scenes tab first
  await clickContentTab('scenes');

  const rows = await page.$$('.tab[data-tab="scenes"] tbody tr');
  return rows.length;
};

/**
 * Checks if the Foundry doc button is disabled.
 */
export const isFoundryDocButtonDisabled = async (): Promise<boolean> => {
  const page = sharedContext.page!;

  const btn = await page.$('[data-testid="entry-foundry-doc-button"]');
  if (!btn) return true;

  return await btn.evaluate(el => (el as HTMLButtonElement).disabled);
};

/**
 * Clicks the Foundry doc button (opens scene for locations).
 */
export const clickFoundryDocButton = async (): Promise<void> => {
  const page = sharedContext.page!;

  const btn = await page.$('[data-testid="entry-foundry-doc-button"]');
  if (btn) {
    await btn.click();
    // Wait for sheet to open (Foundry v13 uses .app.window-app structure)
    await page.waitForSelector('.app.window-app', { timeout: 5000 }).catch(() => {});
  }
};

////////////////////
// Test data creation via API
////////////////////

/**
 * Creates a journal entry via the API for testing.
 * @param name The name of the journal
 * @returns The UUID of the created journal
 */
export const createJournalViaAPI = async (name: string): Promise<string> => {
  const page = sharedContext.page!;

  const uuid = await page.evaluate(
    async (name: string) => {
      // Create a journal entry using Foundry's API
      const journal = await JournalEntry.create({
        name,
      });
      return journal?.uuid || '';
    },
    name
  );

  return uuid;
};

/**
 * Deletes a journal entry via the API.
 * @param uuid The UUID of the journal to delete
 */
export const deleteJournalViaAPI = async (uuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(async (uuid: string) => {
    const doc = await fromUuid(uuid);
    if (doc) {
      await doc.delete();
    }
  }, uuid);
};


/**
 * Gets an entry by UUID via the API.
 */
export const getEntryViaAPI = async (uuid: string): Promise<{ uuid: string; name: string; type: string } | null> => {
  const page = sharedContext.page!;

  return await page.evaluate(async (uuid: string) => {
    const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
    const entry = await api.getEntry?.(uuid);
    if (entry) {
      return { uuid: entry.uuid, name: entry.name, type: entry.type };
    }
    return null;
  }, uuid);
};

/**
 * Sets the parent of an entry via the API.
 * @param entryUuid The entry UUID
 * @param parentUuid The parent entry UUID
 */
export const setEntryParentViaAPI = async (entryUuid: string, parentUuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(
    async ({ entryUuid, parentUuid }: { entryUuid: string; parentUuid: string }) => {
      const api = (game as any).modules.get('campaign-builder')!.api!.testAPI;
      await api.setEntryParent?.(entryUuid, parentUuid);
    },
    { entryUuid, parentUuid }
  );
};

/**
 * Adds a scene to a location via the API.
 * @param locationUuid The location UUID
 * @param sceneUuid The scene UUID
 */
export const addSceneToLocationViaAPI = async (locationUuid: string, sceneUuid: string): Promise<void> => {
  const page = sharedContext.page!;

  await page.evaluate(
    async ({ locationUuid, sceneUuid }: { locationUuid: string; sceneUuid: string }) => {
      const entry = await fromUuid(locationUuid) as any;
      if (entry && 'scenes' in entry && Array.isArray(entry.scenes)) {
        entry.scenes.push(sceneUuid);
        await entry.save?.();
      }
    },
    { locationUuid, sceneUuid }
  );
};

/**
 * Creates a scene via the API.
 * @param name The name of the scene
 * @returns The UUID of the created scene
 */
export const createSceneViaAPI = async (name: string): Promise<string> => {
  const page = sharedContext.page!;

  const uuid = await page.evaluate(async (name: string) => {
    const scene = await Scene.create({
      name,
      navigation: true,
    });
    return scene?.uuid || '';
  }, name);

  return uuid;
};
