import { test as base, Page, BrowserContext } from '@playwright/test';
import { initializeWorld } from './auth';

type FCBFixtures = {
  fcbPage: Page;
  fcbContext: BrowserContext;
};

// Extend base test with custom fixtures
export const test = base.extend<FCBFixtures>({
  fcbContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    await use(context);
    await context.close();
  },

  fcbPage: async ({ fcbContext }, use) => {
    const page = await fcbContext.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`Console error: ${msg.text()}`);
    });

    await initializeWorld(page, fcbContext);
    await use(page);
  },
});

export { expect } from '@playwright/test';
