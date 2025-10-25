import { devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();


/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default {
  testDir: './test/e2e',
  /* Run tests in serial mode - all tests share the same page */
  fullyParallel: false,
  /* Maximum time one test can run for. */
  // timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  workers: 1, // important so tests don't interfere with each other

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',

  // Configure the 'open' property for the HTML reporter
  html: {
    open: 'never', // or on-failure once things running better
  },

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    // headless: false,
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
    trace: 'on',
  },


  /* Configure projects for major browsers */
  projects: [
    // Default project for running specific test files
    {
      name: 'headless',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        launchOptions: {
          args: [
            "--no-sandbox", // Recommended for Linux environments
            "--disable-dev-shm-usage",
            "--disable-gpu", // because we're not using canas
            '--use-gl=swiftshader',    // fast, predictable software GL
            "--enable-unsafe-swiftshader",
            '--disable-webgl2',
            '--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process',
            // "--use-gl=egl", // Use EGL as the graphics backend
            // "--enable-features=Vulkan", // (Optional) Use Vulkan for newer setups
            // "--use-angle=vulkan", // (Optional) Use ANGLE with Vulkan backend
            // "--ignore-gpu-blocklist", // Ignore a list of blocked GPUs
            // "--enable-accelerated-2d-canvas",
            // "--enable-webgl",
          ],
        },
      },
    },
    // Setup project: only runs initialize and rebuild
    {
      name: 'rebuild',
      testMatch: /.*rebuild\.test\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        launchOptions: {
          args: [
            "--no-sandbox", // Recommended for Linux environments
            "--disable-dev-shm-usage",
            "--enable-gpu",
            "--use-gl=egl", // Use EGL as the graphics backend
            "--enable-features=Vulkan", // (Optional) Use Vulkan for newer setups
            "--use-angle=vulkan", // (Optional) Use ANGLE with Vulkan backend
            "--ignore-gpu-blocklist", // Ignore a list of blocked GPUs
            "--enable-accelerated-2d-canvas",
            "--enable-webgl",
          ],
        },
      },
    },
    // Tests project: runs all tests except rebuild
    {
      name: 'all',
      dependencies: ['rebuild'],
      testIgnore: [/.*rebuild\.test\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
        launchOptions: {
          args: [
            "--no-sandbox", // Recommended for Linux environments
            "--disable-dev-shm-usage",
            "--enable-gpu",
            "--use-gl=egl", // Use EGL as the graphics backend
            "--enable-features=Vulkan", // (Optional) Use Vulkan for newer setups
            "--use-angle=vulkan", // (Optional) Use ANGLE with Vulkan backend
            "--ignore-gpu-blocklist", // Ignore a list of blocked GPUs
            "--enable-accelerated-2d-canvas",
            "--enable-webgl",
          ],
        },
      },
    },
    // this opens a browser (ex. for debugging)
    {
      name: 'browser',
      testIgnore: [/.*rebuild\.test\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',  // Use installed Google Chrome
        launchOptions: {
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--ozone-platform=wayland',
            '--enable-gpu',
            '--enable-accelerated-2d-canvas',
            '--enable-webgl',
            '--ignore-gpu-blocklist',
          ],
        },
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',
};


