import { Browser } from '@playwright/test';
import { sharedContext } from './sharedContext';
import { initializeWorld, loginToWorld, openCampaignBuilder } from './utils';

let setupComplete = false;

/**
 * Ensures that the global setup (browser, login, initialize, open) has been run.
 * Call this in beforeAll of each test file. It will only run once per test session.
 */
export async function ensureSetup(browser: Browser, rebuild = false) {
  if (setupComplete && sharedContext.page && sharedContext.context) {
    console.log('Setup already complete, skipping...');
    return;
  }
  
  console.log('Running setup...');
  
  // Setup browser
  sharedContext.context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  
  sharedContext.page = await sharedContext.context.newPage();
  
  sharedContext.page.on('console', msg => {
    if (msg.type() === 'error') console.log(`Console error: ${msg.text()}`);
  });
  
  // Login
  await loginToWorld();
  
  // Reset the world
  if (rebuild)
     await initializeWorld();
  
  // Open the window
  await openCampaignBuilder();
  
  setupComplete = true;
  console.log('Setup complete!');
}

/**
 * Checks if setup has been completed
 */
export function isSetupComplete(): boolean {
  return setupComplete;
}
