/**
 * Directory basic E2E tests.
 * Tests directory tree operations: expanding folders, collapsing all,
 * and opening entries from the directory.
 */

import { expect } from 'chai';
import { sharedContext } from '@e2etest/sharedContext';
import { testData } from '@e2etest/data';
import { expandTopicNode, expandTypeNode, switchToSetting } from '@e2etest/utils';
import { Topics, ValidTopic } from '../types';
import { getByTestId } from '../helpers';


/**
 * Basic Directory Functions Tests
 * Verifies directory tree navigation and folder expansion.
 */
describe('Basic Directory functions', () => {
	before(async () => {
		// Ensure setup is done with test data populated
		
		const setting = testData.settings[0];

		// pick the right setting
		await switchToSetting(setting.name);

		// close the tabs?
	});

	/**
	 * What it tests: Expanding entry topic folders reveals entries.
	 * Expected behavior: Entries become visible when their topic folder is expanded.
	 */
	it('Expand entry folders', async () => {
		const page = sharedContext.page!;
		const setting = testData.settings[0];

		// make sure everything closed to start, just in case
		await page.click(getByTestId('collapse-all-button'));

		// Wait for the collapse to complete
		await page.waitForSelector('.fcb-topic-folder.collapsed');
		
		// Small delay for animations
		await new Promise(resolve => setTimeout(resolve, 200));

		// make sure the 1st topic isn't visible (check visibility, not just DOM presence)
		const found = await page.evaluate((entryName: string) => {
			const entries = Array.from(document.querySelectorAll('.fcb-directory-entry'));
			return entries.some(el => {
				// Check if visible (not hidden by collapsed parent)
				const style = window.getComputedStyle(el);
				const parent = el.closest('.collapsed');
				const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && !parent;
				return isVisible && el.textContent?.includes(entryName);
			});
		}, setting.topics[Topics.Character][0].name);
		// Expected behavior: Entry is not visible when folder is collapsed
		expect(found).to.equal(false);

		// open each folder and make sure the 1st node is visible
		for (const topicKey in setting.topics) {
			const topic = Number.parseInt(topicKey) as ValidTopic;
			await expandTopicNode(topic);

			// for characters, we need to expand the 'none' folder first
			if (topic === Topics.Character) {
				await expandTypeNode(topic, '(none)');
			}

			const topicEntries = setting.topics[topic];
			
			// Wait for entries to be visible (not just present in DOM)
			await page.waitForSelector('.fcb-directory-entry', { timeout: 5000 });
			
			// Verify the entry is visible by checking for collapsed parent
			const entriesAfter = await page.$$('.fcb-directory-entry');
			let entryFound = false;
			for (const entry of entriesAfter) {
				const isVisible = await entry.evaluate(el => {
					const parent = el.closest('.collapsed');
					return !parent;
				});
				if (isVisible) {
					const text = await entry.evaluate(el => el.textContent);
					if (text?.includes(topicEntries[0].name)) {
						entryFound = true;
						break;
					}
				}
			}
			// Expected behavior: Entry is visible after expanding folder
			expect(entryFound).to.equal(true);
		}

		// also check collapse all
		await page.click(getByTestId('collapse-all-button'));
		
		// Wait for collapse to complete
		await new Promise(resolve => setTimeout(resolve, 200));

		// make sure the 1st topic isn't visible (check visibility, not just DOM presence)
		const foundAfterCollapse = await page.evaluate((entryName: string) => {
			const entries = Array.from(document.querySelectorAll('.fcb-directory-entry'));
			return entries.some(el => {
				// Check if visible (not hidden by collapsed parent)
				const style = window.getComputedStyle(el);
				const parent = el.closest('.collapsed');
				const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && !parent;
				return isVisible && el.textContent?.includes(entryName);
			});
		}, setting.topics[Topics.Character][0].name);
		// Expected behavior: Entry is not visible after collapsing all
		expect(foundAfterCollapse).to.equal(false);
	});
});
