/**
 * Browser management utilities for Puppeteer agent tooling
 */

import puppeteer, { Browser, Page, BrowserContext } from 'puppeteer';
import { config } from './config';

/** Result of launching browser */
export interface BrowserResult {
  browser: Browser;
  page: Page;
  context: BrowserContext;
}

/** Options for launching browser */
export interface LaunchOptions {
  /** Whether to refresh the page on launch (default: true for clean state after builds) */
  refresh?: boolean;
}

/** Shared browser instance (for reuse across calls) */
let sharedBrowser: Browser | null = null;
let sharedPage: Page | null = null;

/**
 * Launches or connects to a browser based on BROWSER_MODE config.
 *
 * @param options - Launch options
 * @returns Browser, page, and context handles
 */
export async function launchBrowser(options: LaunchOptions = {}): Promise<BrowserResult> {
  const { refresh = true } = options;

  // If we already have a browser and page, optionally refresh and return
  if (sharedBrowser && sharedPage) {
    if (refresh) {
      await sharedPage.reload({ waitUntil: 'networkidle2' });
    }
    return { browser: sharedBrowser, page: sharedPage, context: sharedPage.browserContext() };
  }

  let browser: Browser;
  let page: Page;

  if (config.browserMode === 'attach') {
    // Connect to existing browser with remote debugging
    // Use browserHost for WSL2 compatibility (Windows localhost isn't directly accessible)
    browser = await puppeteer.connect({
      browserURL: `http://${config.browserHost}:${config.debuggingPort}`,
    });
    const pages = await browser.pages();
    page = pages[0] || await browser.newPage();

    // Set viewport size (attach mode uses actual window size, override it)
    await page.setViewport({
      width: config.viewportWidth,
      height: config.viewportHeight,
    });

    // Re-apply viewport after navigation (Puppeteer resets to 800x600 default)
    page.on('framenavigated', async () => {
      const currentViewport = page.viewport();
      if (currentViewport?.width !== config.viewportWidth || currentViewport?.height !== config.viewportHeight) {
        await page.setViewport({
          width: config.viewportWidth,
          height: config.viewportHeight,
        });
      }
    });
  } else {
    // Headed mode (default) - uses swiftshader for WebGL compatibility
    browser = await puppeteer.launch({
      headless: false,
      executablePath: config.executablePath,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-gpu-rasterization',
        '--ignore-gpu-blocklist',
        '--enable-unsafe-webgl',
      ],
      defaultViewport: {
        width: config.viewportWidth,
        height: config.viewportHeight,
      },
    });
    page = await browser.newPage();
  }

  // Set up console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error] ${msg.text()}`);
    }
  });

  // Store for reuse
  sharedBrowser = browser;
  sharedPage = page;

  return { browser, page, context: page.browserContext() };
}

/**
 * Gets the current shared page, or launches a new browser if needed.
 *
 * @returns Page handle
 */
export async function getPage(): Promise<Page> {
  if (sharedPage) return sharedPage;
  const { page } = await launchBrowser({ refresh: false });
  return page;
}

/**
 * Closes the browser and clears shared state.
 */
export async function closeBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    sharedPage = null;
  }
}

/**
 * Takes a screenshot for debugging.
 *
 * @param filename - Path to save screenshot
 */
export async function screenshot(filename: string): Promise<void> {
  const page = await getPage();
  await page.screenshot({ path: filename, fullPage: true });
}
