/**
 * Campaign Builder module interaction utilities
 */

import { Page } from 'puppeteer';
import { getPage } from './browser';

/**
 * Opens the Campaign Builder main window.
 * Assumes Foundry is already in game view.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function openCampaignBuilder(page?: Page): Promise<void> {
  const p = page || await getPage();

  // Check if module is loaded
  const moduleStatus = await p.evaluate(() => {
    const module = game?.modules?.get('campaign-builder') as {
      active?: boolean;
      initialized?: boolean;
      api?: unknown;
    } | undefined;
    return {
      exists: !!module,
      active: module?.active,
      initialized: module?.initialized,
      hasApi: !!module?.api,
    };
  });
  console.log('Module status:', moduleStatus);

  // Check if window is already open
  const alreadyOpen = await p.$('.fcb-main-window');
  if (alreadyOpen) {
    console.log('Campaign Builder already open');
    return;
  }

  // Wait for the launch button to appear
  console.log('Waiting for launch button...');
  await p.waitForSelector('#fcb-launch', { timeout: 5000 });
  console.log('Launch button found');

  // Click the launch button using evaluate for reliability
  await p.evaluate(() => {
    const btn = document.querySelector('#fcb-launch');
    if (btn instanceof HTMLElement) {
      btn.click();
    }
  });
  console.log('Launch button clicked');

  // Wait for the main window to appear
  await p.waitForSelector('.fcb-main-window', { visible: true, timeout: 5000 });
  console.log('Main window appeared');

  // Wait for Vue app to be ready
  await p.waitForFunction(() => {
    const win = document.querySelector('.fcb-main-window');
    if (!win) return false;
    // Check for tabs in the tab panel
    const tabs = win.querySelectorAll('.fcb-tab');
    // Also check for home page (no settings case)
    const homePage = win.querySelector('.fcb-home-page');
    return tabs.length > 0 || homePage != null;
  }, { timeout: 5000 });
  console.log('Vue app ready');
}

/**
 * Closes the Campaign Builder main window.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function closeCampaignBuilder(page?: Page): Promise<void> {
  const p = page || await getPage();

  // Click the close button in the window header (Foundry uses [data-action="close"])
  const closeButton = await p.$('.fcb-main-window [data-action="close"]');
  if (closeButton) {
    await closeButton.click();
    await p.waitForSelector('.fcb-main-window', { hidden: true, timeout: 5000 });
  }
}

/**
 * Switches to a specific tab in the Campaign Builder.
 *
 * @param tabName - Name of the tab (e.g., 'settings', 'campaigns', 'sessions')
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function switchToTab(tabName: string, page?: Page): Promise<void> {
  const p = page || await getPage();

  const tabSelector = `[data-tab="${tabName}"]`;
  await p.waitForSelector(tabSelector, { timeout: 5000 });
  await p.click(tabSelector);

  // Wait for tab content to be visible
  await p.waitForSelector(`.fcb-tab-content.active`, { timeout: 5000 });
}

/**
 * Gets the currently active tab name.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns Active tab name or null
 */
export async function getActiveTab(page?: Page): Promise<string | null> {
  const p = page || await getPage();

  const activeTab = await p.$('.fcb-content-tab.active');
  if (!activeTab) return null;

  return activeTab.evaluate(el => el.getAttribute('data-tab'));
}

/**
 * Waits for the Campaign Builder to be ready.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function waitForCampaignBuilder(page?: Page): Promise<void> {
  const p = page || await getPage();

  // Wait for launch button (Foundry ready)
  await p.waitForSelector('#fcb-launch', { timeout: 30000 });

  // Wait for module to initialize
  await p.waitForFunction(() => {
    return typeof game !== 'undefined' &&
           game?.modules?.get('campaign-builder')?.active;
  }, { timeout: 30000 });
}

/**
 * Checks if the Campaign Builder window is open.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns True if window is open
 */
export async function isCampaignBuilderOpen(page?: Page): Promise<boolean> {
  const p = page || await getPage();

  const win = await p.$('.fcb-main-window');
  return win !== null;
}
