/**
 * Foundry VTT navigation and state detection utilities
 */

import { Page } from 'puppeteer';
import * as readline from 'readline';
import { config, FoundryState } from './config';
import { getPage } from './browser';

/** Cached admin password (prompted once per session) */
let cachedAdminPassword: string | null = null;

/**
 * Prompts for admin password if not already provided.
 *
 * @returns Admin password
 */
async function getAdminPassword(): Promise<string> {
  if (cachedAdminPassword) return cachedAdminPassword;
  if (config.adminPassword) return config.adminPassword;

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter Foundry admin password: ', (password) => {
      rl.close();
      cachedAdminPassword = password;
      resolve(password);
    });
  });
}

/**
 * Detects the current Foundry state based on URL and page content.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns Detected Foundry state
 */
export async function detectFoundryState(page?: Page): Promise<FoundryState> {
  const p = page || await getPage();
  const url = p.url();

  // Check URL patterns first
  if (url.includes('/game')) {
    // Verify game is actually ready
    const isReady = await p.evaluate(() => {
      return typeof game !== 'undefined' && game?.ready === true;
    });
    return isReady ? 'game' : 'unknown';
  }

  if (url.includes('/join')) {
    // Check if we're on login page or world selection
    const hasUserSelect = await p.$('select[name="userid"]');
    return hasUserSelect ? 'login' : 'unknown';
  }

  // Auth page (password prompt)
  if (url.includes('/auth')) {
    return 'setup';
  }

  if (url.includes('/setup')) {
    // Could be world selection or setup authentication
    const hasWorldList = await p.$('[data-package-id]');
    const hasPasswordField = await p.$('input[type="password"]');
    if (hasWorldList) return 'worldSelection';
    if (hasPasswordField) return 'setup';
    return 'worldSelection'; // Default to world selection on /setup
  }

  // Check for "no active session" page at root URL
  if (url === config.foundryUrl || url === `${config.foundryUrl}/`) {
    const hasNoSession = await p.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1?.textContent?.includes('No Active Session') ?? false;
    });
    if (hasNoSession) return 'setup';
  }

  return 'unknown';
}

/**
 * Navigates to the Foundry game view from any starting state.
 * Handles login and world selection if needed.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function navigateToGame(page?: Page): Promise<void> {
  const p = page || await getPage();

  // First, navigate to Foundry URL if not already there
  const currentUrl = p.url();
  if (!currentUrl.includes(config.foundryUrl)) {
    await p.goto(config.foundryUrl, { waitUntil: 'networkidle2' });
  }

  // Detect current state and navigate accordingly
  let state = await detectFoundryState(p);

  // Handle "no active session" or setup authentication
  if (state === 'setup' || state === 'unknown') {
    // Navigate to setup page
    await p.goto(`${config.foundryUrl}/setup`, { waitUntil: 'networkidle2' });
    state = await detectFoundryState(p);

    // Handle password prompt if present
    const hasPasswordField = await p.$('input[type="password"]');
    if (hasPasswordField) {
      await handleSetupAuthentication(p);
      state = await detectFoundryState(p);
    }
  }

  // Handle world selection page
  if (state === 'worldSelection') {
    await selectWorld(p);
    state = await detectFoundryState(p);
  }

  // Handle login page
  if (state === 'login') {
    await loginToWorld(p);
    state = await detectFoundryState(p);
  }

  // Verify we're in game
  if (state !== 'game') {
    throw new Error(`Failed to navigate to game. Current state: ${state}`);
  }
}

/**
 * Handles setup page authentication with admin password.
 *
 * @param page - Page handle
 */
async function handleSetupAuthentication(page: Page): Promise<void> {
  const password = await getAdminPassword();

  // Wait for password field to be visible
  await page.waitForSelector('input[type="password"]', { visible: true, timeout: 5000 });

  // Clear any existing value and type password
  await page.click('input[type="password"]', { clickCount: 3 }); // Select all
  await page.type('input[type="password"]', password);

  // Small delay to ensure input is registered
  await new Promise(resolve => setTimeout(resolve, 100));

  // Submit the form - try button first, then Enter key
  const submitButton = await page.$('button[type="submit"]');
  if (submitButton) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }),
      submitButton.click(),
    ]);
  } else {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }),
      page.keyboard.press('Enter'),
    ]);
  }
}

/**
 * Selects a world from the world selection page.
 *
 * @param page - Page handle
 */
async function selectWorld(page: Page): Promise<void> {
  // Try pressing Escape to dismiss any overlay/tour
  await page.keyboard.press('Escape');
  await new Promise(resolve => setTimeout(resolve, 300));

  // Handle tour/overlay popup if present (new users, cookies cleared)
  const hasOverlay = await page.evaluate(() => {
    // Check for common overlay/tour elements
    const overlay = document.querySelector('.tour-overlay, .onboarding-overlay, [data-tour], dialog[open]');
    if (overlay) {
      // Try to find close/dismiss button by text content
      const buttons = Array.from(overlay.querySelectorAll('button'));
      const closeBtn = buttons.find(b =>
        b.classList.contains('close') ||
        b.dataset.dismiss !== undefined ||
        b.textContent?.includes('Skip') ||
        b.textContent?.includes('Close') ||
        b.textContent?.includes('Dismiss')
      );
      if (closeBtn instanceof HTMLElement) {
        closeBtn.click();
        return true;
      }
    }
    return false;
  });
  if (hasOverlay) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Handle backup popup if present
  const hasBackupDialog = await page.evaluate(() => {
    const h3 = document.querySelector('h3');
    return h3?.textContent?.includes('Backups Overview') ?? false;
  });
  if (hasBackupDialog) {
    await page.evaluate(() => {
      const h3 = document.querySelector('h3');
      const button = h3?.closest('dialog')?.querySelector('a[role="button"]');
      if (button instanceof HTMLElement) button.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Click on the world's play button
  const worldSelector = `[data-package-id="${config.worldId}"]`;
  await page.waitForSelector(worldSelector, { timeout: 5000 });

  // Find and click the play button directly
  const clicked = await page.evaluate((worldId: string) => {
    const world = document.querySelector(`[data-package-id="${worldId}"]`);
    if (!world) return false;
    const playBtn = world.querySelector('a.play, button.play, .play');
    if (playBtn instanceof HTMLElement) {
      playBtn.click();
      return true;
    }
    return false;
  }, config.worldId);

  if (!clicked) {
    throw new Error(`Could not find play button for world: ${config.worldId}`);
  }

  // Wait for navigation to join or game page - with timeout handling
  // The world launch might take time, so wait for URL change
  // But first check for data migration dialog
  await new Promise(resolve => setTimeout(resolve, 500));

  const hasMigrationDialog = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const migrateBtn = buttons.find(b => b.textContent?.includes('Begin Migration'));
    if (migrateBtn instanceof HTMLElement) {
      migrateBtn.click();
      return true;
    }
    return false;
  });

  if (hasMigrationDialog) {
    // Wait for backup dialog to appear
    await new Promise(resolve => setTimeout(resolve, 500));

    // Handle backup dialog
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const backupBtn = buttons.find(b => b.textContent?.includes('Backup'));
      if (backupBtn instanceof HTMLElement) {
        backupBtn.click();
      }
    });

    // Wait for migration/backup to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  await page.waitForFunction(() => {
    return window.location.href.includes('/join') || window.location.href.includes('/game');
  }, { timeout: 5000 });

  // Wait a bit for the page to settle
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * Logs into the Foundry world.
 *
 * @param page - Page handle
 */
async function loginToWorld(page: Page): Promise<void> {
  // Select user from dropdown by finding the option with matching text
  await page.waitForSelector('select[name="userid"]', { timeout: 5000 });

  // Find and select the user option by text content
  await page.evaluate((userName: string) => {
    const select = document.querySelector('select[name="userid"]') as HTMLSelectElement;
    if (select) {
      const options = Array.from(select.options);
      const option = options.find(opt => opt.textContent?.includes(userName));
      if (option) {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, config.user);

  // Small delay to ensure selection is registered
  await new Promise(resolve => setTimeout(resolve, 100));

  // Click join button - find by text content
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const joinButton = buttons.find(b => b.textContent?.includes('Join Game Session'));
    if (joinButton instanceof HTMLElement) {
      joinButton.click();
    }
  });

  // Wait for Foundry to be ready (instead of navigation which may complete before we wait)
  await page.waitForFunction(() => {
    return typeof game !== 'undefined' && game?.ready === true;
  }, { timeout: 15000 });

  // Disable tooltips to prevent interference
  await page.evaluate(() => {
    if (typeof game !== 'undefined' && game.tooltip) {
      game.tooltip.activate = function() {};
    }
  });
}

/**
 * Resets the world using the test API.
 * Note: This may cause the page to reload, so callers should handle reconnection.
 *
 * @param page - Page handle (optional, uses shared page if not provided)
 */
export async function resetWorld(page?: Page): Promise<void> {
  const p = page || await getPage();
  console.log('[resetWorld] Starting world reset...');

  try {
    await p.evaluate(async () => {
      const module = game?.modules?.get('campaign-builder') as { api?: { testAPI?: { resetAll: () => Promise<void> } } } | undefined;
      const api = module?.api;
      console.log('[resetWorld] Module found:', !!module, 'API found:', !!api);
      if (api?.testAPI?.resetAll) {
        console.log('[resetWorld] Calling testAPI.resetAll()...');
        await api.testAPI.resetAll();
        console.log('[resetWorld] testAPI.resetAll() complete');
      } else {
        throw new Error('Test API not available. Ensure module is loaded with debug:test build.');
      }
    });

    console.log('[resetWorld] World reset complete');
  } catch (error) {
    // Frame may detach during reset - this is expected
    if (error instanceof Error && error.message.includes('detached')) {
      console.log('[resetWorld] World reset complete (frame detached during reset)');
      return;
    }
    console.log('[resetWorld] Error:', error);
    throw error;
  }
}

/**
 * Evaluates a function in the browser context.
 *
 * @param fn - Function to evaluate
 * @param page - Page handle (optional, uses shared page if not provided)
 * @returns Result of the function
 */
export async function evaluate<T>(fn: () => T, page?: Page): Promise<T> {
  const p = page || await getPage();
  return p.evaluate(fn);
}
