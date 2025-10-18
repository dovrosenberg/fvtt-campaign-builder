import { expect, Locator, } from 'playwright/test';
import { sharedContext } from '../sharedContext';
import { Topics, ValidTopic } from '@/types';

export const switchToSetting = async (settingName: string) => {
  const page = sharedContext.page!;

  await page.getByTestId('setting-select').click();
  await page.locator('.p-select-option-label')
    .filter({hasText: settingName})
    .click();

  // Wait for the setting folder header to be visible
  await expect(page.getByTestId(`setting-folder-${settingName}`)).toBeAttached();
  
  // Wait for topic folders to load
  await expect(page.locator('.fcb-topic-folder').first()).toBeAttached();
}

export const confirmSettingInList = async (settingName: string): Promise<Locator> => {
  const page = sharedContext.page!;

  await page.getByTestId('setting-select').click();
  await page.locator('.p-select-option-label')
    .filter({hasText: settingName})
    .click();

  // return the locator for the folder header
  const folderHeader = page.getByTestId(`setting-folder-${settingName}`);
  await expect(folderHeader).toBeVisible();

  return folderHeader;
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

  // see if it's collapsed
  const folder = page.locator('.fcb-topic-folder.collapsed')
    .filter({ hasText: topicText[topic] });

  if (await folder.count() > 0) {
    // Click the inner div which has the actual click handler and is more stable
    await page.getByTestId(`topic-folder-${topic}`).click();

    // Wait for it to no longer be collapsed
    const expandedFolder = page.locator('.fcb-topic-folder')
      .filter({ hasText: topicText[topic] });
    await expect(expandedFolder).not.toHaveClass('collapsed');
  }
}

/** assumes the topic is expanded */
export const expandTypeNode = async (topic: ValidTopic, typeName: string) => {
  const page = sharedContext.page!;

  await expandTopicNode(topic);

  const folder = page.locator('.fcb-topic-folder')
    .filter({ hasText: topicText[topic] });

  const typeNode = folder.locator('.fcb-directory-type')
    .filter({ hasText: typeName });

  // the actual click button is on the previous sibling div, 
  //    which is a fcb-directory-expand-button
  // force=true because this click forces DOM to rerender this element which otherwise breaks playwright
  await typeNode.locator('..')
    .locator('.fcb-directory-expand-button')
    .click({ force: true });
};