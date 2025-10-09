import { Page } from 'playwright';
import { BrowserContext, expect } from 'playwright/test';

const USER = process.env.FVTT_GM_USER || 'Gamemaster';
const PASS = process.env.FVTT_GM_PASSWORD || '';
const WORLDID = process.env.FVTT_WORLDID || 'campaignbuildertest';

export async function initializeWorld(page: Page, context: BrowserContext){
  // Go to http://localhost:30000/setup
  await page.goto('http://localhost:30000/setup', { waitUntil: 'networkidle' });

  if (page.url() === 'http://localhost:30000/setup') {
    // open the world
    await Promise.all([
      page.waitForNavigation(/*{ url: 'http://localhost:30000/join' }*/),
      page.locator(`[data-package-id="${WORLDID}"] a.play`).dispatchEvent('click')
    ]);
  } 

  // we may start here if we end up on join

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

  //Wait for campaign builder to load
  await page.waitForFunction(() => {
    return !!jQuery && jQuery('#fcb-launch').length > 0;
  });

  // click on the button
  const openButton = page.locator('#fcb-launch');
  await openButton.click({ force: true })
}

export async function fillOutNameDialog(page: Page, headerText: string, name: string) {
  const dialog = await page.locator('div.app.window-app.dialog', { 
    has: page.locator(`header h4:has-text("${headerText}")`)
  });

  // find the text box - it's in a <section> tag that is in the same <div> as the <header>
  //   that contains the <h4>
  const nameInput = await dialog.locator('section div p input[type="text"]');
  await expect(nameInput).toBeVisible();

  // put in text
  await nameInput.fill(name);

  // click the button
  await dialog.locator('.dialog-button.ok').click();
}

