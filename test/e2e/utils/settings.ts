import { sharedContext } from '../sharedContext';
import { Topics, ValidTopic } from '@/types';
import { getByTestId } from '../helpers';

export const switchToSetting = async (settingName: string) => {
  const page = sharedContext.page!;

  // Debug: Check what's in the DOM
  const settingSelectExists = await page.$('[data-testid="setting-select"]');

  if (!settingSelectExists) {
    // If no setting select, there might be only one setting - check for setting folder directly
    const folderExists = await page.$(`[data-testid="setting-folder-${settingName}"]`);
    if (folderExists) {
      // Already on the right setting
      return;
    }
    // Wait a bit and try again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Wait for setting select to be visible (it only appears when there are multiple settings)
  await page.waitForSelector('[data-testid="setting-select"]', { timeout: 5000 });

  // Click the setting select dropdown
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="setting-select"]') as HTMLElement;
    if (el) el.click();
  });
  
  // Wait for PrimeVue dropdown portal to render (it's attached to body, not the component)
  await page.waitForSelector('.p-select-list-container', { timeout: 5000 });
  
  // Small delay for options to populate
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Click the option with the setting name using page.evaluate
  await page.evaluate((name: string) => {
    const options = document.querySelectorAll('.p-select-option-label');
    for (const option of options) {
      if (option.textContent?.includes(name)) {
        (option as HTMLElement).click();
        break;
      }
    }
  }, settingName);

  // Wait for the setting folder header to be visible
  await page.waitForSelector(`[data-testid="setting-folder-${settingName}"]`, { timeout: 5000 });
  
  // Wait for topic folders to load
  await page.waitForSelector('.fcb-topic-folder', { timeout: 5000 });
}

export const confirmSettingInList = async (settingName: string): Promise<void> => {
  const page = sharedContext.page!;

  // Open the dropdown
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="setting-select"]') as HTMLElement;
    if (el) el.click();
  });

  // Wait for dropdown to render
  await page.waitForSelector('.p-select-list-container', { timeout: 5000 });
  await new Promise(resolve => setTimeout(resolve, 100));

  // Click the option with the setting name
  await page.evaluate((name: string) => {
    const options = document.querySelectorAll('.p-select-option-label');
    for (const option of options) {
      if (option.textContent?.includes(name)) {
        (option as HTMLElement).click();
        break;
      }
    }
  }, settingName);

  // Wait for the folder header to be visible
  await page.waitForSelector(getByTestId(`setting-folder-${settingName}`), { timeout: 5000 });
}

const topicText = {
  [Topics.Character]: 'Characters',
  [Topics.Location]: 'Locations',
  [Topics.Organization]: 'Organizations',
  [Topics.PC]: 'PCs',
};

/** ensures that the topic node is expanded, regardless of starting state */
export const expandTopicNode = async (topic: ValidTopic) => {
  const page = sharedContext.page!;

  // Use page.evaluate to check and expand the topic node
  const isCollapsed = await page.evaluate((topicId: number, topicLabel: string) => {
    const folders = document.querySelectorAll('.fcb-topic-folder.collapsed');
    for (const folder of folders) {
      if (folder.textContent?.includes(topicLabel)) {
        return true;
      }
    }
    return false;
  }, topic, topicText[topic]);

  if (isCollapsed) {
    // Click the topic folder to expand it
    await page.evaluate((topicId: number) => {
      const el = document.querySelector(`[data-testid="topic-folder-${topicId}"]`) as HTMLElement;
      if (el) el.click();
    }, topic);

    // Wait for it to no longer be collapsed
    await page.waitForFunction((topicLabel: string) => {
      const folders = Array.from(document.querySelectorAll('.fcb-topic-folder'));
      return folders.some(f => f.textContent?.includes(topicLabel) && !f.classList.contains('collapsed'));
    }, {}, topicText[topic]);
  }

  // Wait for content to load within the topic folder
  // For grouped trees, entries are inside type nodes; for nested trees, entries are direct children
  // Wait for either type nodes or direct entries to appear
  await page.waitForFunction((topicId: number) => {
    const topicFolder = document.querySelector(`.fcb-topic-folder[data-topic="${topicId}"]`);
    if (!topicFolder) return false;
    // Check for type nodes (grouped tree) or direct entries (nested tree)
    return topicFolder.querySelector('.fcb-directory-type') !== null ||
      topicFolder.querySelector('.fcb-directory-entry') !== null;
  }, { timeout: 5000 }, topic);
}

/** assumes the topic is expanded */
export const expandTypeNode = async (topic: ValidTopic, typeName: string) => {
  const page = sharedContext.page!;

  await expandTopicNode(topic);

  // Small delay for DOM to update after topic expansion
  await new Promise(resolve => setTimeout(resolve, 100));

  // Use page.evaluate to find and click the type node expand button directly
  // This avoids stale element handle issues
  const clicked = await page.evaluate((topicId: number, type: string) => {
    const topicFolder = document.querySelector(`.fcb-topic-folder[data-topic="${topicId}"]`);
    if (!topicFolder) return false;

    // Find the type node with the type name
    const typeNodes = topicFolder.querySelectorAll('.fcb-directory-type');
    
    for (const typeNode of typeNodes) {
      if (typeNode.textContent?.includes(type)) {
        // The expand button is a previous sibling within the same parent
        const expandButton = typeNode.previousElementSibling as HTMLElement;
        if (expandButton && expandButton.textContent?.includes('+')) {
          expandButton.click();
          return true;
        }
        // Already expanded
        return true;
      }
    }
    return false;
  }, topic, typeName);

  if (clicked) {
    // Wait for entries to appear within the specific type node container (not just any entry in the topic folder)
    await page.waitForFunction((topicId: number, type: string) => {
      const topicFolder = document.querySelector(`.fcb-topic-folder[data-topic="${topicId}"]`);
      if (!topicFolder) return false;
      const typeNodes = topicFolder.querySelectorAll('.fcb-directory-type');
      for (const typeNode of typeNodes) {
        if (typeNode.textContent?.includes(type)) {
          const container = typeNode.closest('.fcb-type-item');
          if (!container) return false;
          return container.querySelector('.fcb-directory-entry, .fcb-current-directory-entry') !== null;
        }
      }
      return false;
    }, { timeout: 5000 }, topic, typeName).catch(() => {
      // Proceed even if no entries found (e.g., empty type or timing issue)
    });
    await new Promise(resolve => setTimeout(resolve, 200));
  }
};