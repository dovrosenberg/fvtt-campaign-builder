import { TestContext } from '../types';
import { useMainStore } from '@/applications/stores/mainStore';

const USER = process.env.FVTT_GM_USER || 'Gamemaster';
// const PASS = process.env.FVTT_GM_PASSWORD || '';
const WORLDID = process.env.FVTT_WORLDID || 'campaignbuildertest';

export async function initializeWorld(context: TestContext){
  const page = context.page!;

  // Go to http://localhost:30000/setup
  await page.goto('http://localhost:30000/setup', { waitUntil: 'networkidle' });

  if (page.url() === 'http://localhost:30000/setup') {
    // open the world
    await Promise.all([
      page.waitForNavigation(/*{ url: 'http://localhost:30000/join' }*/),
      page.locator(`[data-package-id="${WORLDID}"] a.play`).click()
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

  // lets delete all the settings...
  await page.evaluate(async () => {
    return await game.modules.get('campaign-builder')?.api.resetAll();
  });

  // click on the button
  const openButton = page.locator('#fcb-launch');
  await openButton.click({ force: true })
}