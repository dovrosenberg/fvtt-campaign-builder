import { expect } from 'playwright/test';
import { sharedContext } from '@e2etest/sharedContext';

const USER = process.env.FVTT_GM_USER || 'Gamemaster';
// const PASS = process.env.FVTT_GM_PASSWORD || '';
// const WORLDID = process.env.FVTT_WORLDID || 'campaignbuildertest';

export async function loginToWorld(){
  const page = sharedContext.page!;

  // because of the backup box that's inconsistent we start on join now
  // Go to http://localhost:30000/setup
  // await page.goto('http://localhost:30000/setup', { waitUntil: 'networkidle' });

  // if (page.url() === 'http://localhost:30000/setup') {
  //   // sometimes there's a backup popup
  //   const backupHeader = page.locator('h3:has-text("Backups Overview")');

  //   if (await backupHeader.isVisible()) {
  //     await backupHeader.locator('..')
  //       .locator('a[role="button"]')
  //       .click({ force: true });
  //   }

  //   // open the world
  //   await page.locator(`[data-package-id="${WORLDID}"] a.play`).click();
  //   await page.waitForURL('http://localhost:30000/join');
  // } 

  await page.goto('http://localhost:30000/join', { waitUntil: 'networkidle' });

  // Select user
  await page.locator('select[name="userid"]').focus();
  await page.locator('select[name="userid"]').selectOption(USER);

  // assume no password for now

  // Click button:has-text("Join Game Session")
  await Promise.all([
    page.waitForNavigation(/*{ url: 'http://localhost:30000/game' }*/),
    page.locator('button:has-text("Join Game Session")').click({ force: true })
  ]);

  // Wait for Foundry
  await page.waitForFunction(() => {
    return game && game.ready;
  });

  // Disable tooltips during tests to prevent interference with Playwright
  await page.evaluate(() => {
    game.tooltip.activate = function() {};
  });

  //Wait for campaign builder to load
  await page.waitForFunction(() => {
    return !!jQuery && jQuery('#fcb-launch').length > 0;
  });
}

export async function openCampaignBuilder(){
  const page = sharedContext.page!;

  // click on the button
  const openButton = page.locator('#fcb-launch');
  await openButton.click({ force: true })

  // wait for the window
  expect(page.locator('.fcb-main-window')).toBeVisible();
}

export async function initializeWorld(){
  const page = sharedContext.page!;

  // lets delete all the settings...
  await page.evaluate(async () => {
    return await game.modules.get('campaign-builder')!.api!.testAPI!.resetAll();
  });
  
  console.log(`World reset`);
}