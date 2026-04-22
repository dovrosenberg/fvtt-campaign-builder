/**
 * Mocha global setup/teardown for E2E tests.
 * Runs exactly once before any test and once after all tests.
 */

import * as fs from 'fs';
import * as path from 'path';
import { sharedContext } from './sharedContext';
import { launchBrowser, navigateToGame, resetWorld, openCampaignBuilder } from './utils';
import { testData } from './data';
import { populateSetting } from './setup';

// Safety net: ensure browser is closed even if mochaGlobalSetup throws
// and mochaGlobalTeardown never runs
process.on('exit', () => {
  if (sharedContext.context) {
    try {
      // Kill the Chrome process directly — disconnect() only detaches Puppeteer
      const browserProcess = (sharedContext.context as any).process?.();
      browserProcess?.kill?.();
    } catch {
      // Best effort
    }
  }
});

/**
 * Checks if test data already exists in the world.
 */
async function testDataExists(): Promise<boolean> {
  const page = sharedContext.page;
  if (!page) return false;

  const settingNames = testData.settings.map(s => s.name);
  const existingSettings = await page.evaluate((names: string[]) => {
    const module = game?.modules?.get('campaign-builder') as { api?: { testAPI?: { getSettingNames: () => string[] } } } | undefined;
    const allNames = module?.api?.testAPI?.getSettingNames() || [];
    return names.every(n => allNames.includes(n));
  }, settingNames);

  return existingSettings;
}

/**
 * Collect Istanbul coverage data from the browser and write to .nyc_output.
 */
async function collectCoverage(): Promise<void> {
  const page = sharedContext.page;
  if (!page) {
    console.log('\x1b[33mNo page available for coverage collection\x1b[0m');
    return;
  }

  try {
    // Pull coverage data from the browser
    const coverage = await page.evaluate(() => {
      return (window as any).__coverage__ ?? null;
    });

    if (!coverage) {
      console.log('\x1b[33mNo coverage data found (build with --mode test to enable instrumentation)\x1b[0m');
      return;
    }

    // Write coverage JSON to .nyc_output for nyc to pick up
    const outputDir = path.resolve(process.cwd(), '.nyc_output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `coverage-${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(coverage));
    console.log(`\x1b[36mCoverage data written to ${outputFile}\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31mFailed to collect coverage: ${error}\x1b[0m`);
  }
}

/**
 * Mocha global setup - runs once before all tests.
 * Connects browser, navigates to Foundry, populates test data, opens Campaign Builder.
 */
export async function mochaGlobalSetup(): Promise<void> {
  console.log('[globalSetup] Starting...');

  // Connect browser and navigate to Foundry
  const { browser, page } = await launchBrowser({ refresh: false });
  sharedContext.context = browser;
  sharedContext.page = page;

  await navigateToGame(page);

  // Populate test data if not already present
  const dataExists = await testDataExists();
  if (!dataExists) {
    console.log('[globalSetup] Resetting world...');
    await resetWorld(page);
    console.log('[globalSetup] World reset complete, waiting for stabilization...');

    // Wait for page to stabilize after reset (may trigger Foundry reload)
    await page.waitForSelector('#game', { timeout: 5000 }).catch(() => {
      console.log('[globalSetup] waitForSelector #game timed out (expected if page reloaded)');
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('[globalSetup] Stabilization wait complete');

    // Populate test data BEFORE opening Campaign Builder window
    // This prevents the "create setting" dialog from appearing when no settings exist
    console.log(`[globalSetup] Populating ${testData.settings.length} settings...`);
    for (let i = 0; i < testData.settings.length; i++) {
      console.log(`[globalSetup] Populating setting ${i + 1}: ${testData.settings[i].name}`);
      await populateSetting(testData.settings[i]);
    }
    console.log('[globalSetup] Test data populated');
  } else {
    console.log('[globalSetup] Test data already exists, skipping data population');
  }

  // Open the Campaign Builder window (after data is populated so settings exist)
  console.log('[globalSetup] Opening Campaign Builder...');
  await openCampaignBuilder(page);
  console.log('[globalSetup] Campaign Builder opened');
  console.log('[globalSetup] Complete!');
}

/**
 * Mocha global teardown - runs once after all tests.
 * Collects coverage data and closes the browser.
 */
export async function mochaGlobalTeardown(): Promise<void> {
  console.log('[globalTeardown] Starting...');

  // Collect Istanbul coverage data from browser
  await collectCoverage();

  // Close browser
  if (sharedContext.context) {
    try {
      await sharedContext.context.close();
    } catch {
      // Ignore disconnect errors
    }
  }

  console.log('[globalTeardown] Complete!');
}
