# E2E Test Architecture

## Overview

This test suite uses **Playwright fixtures** to enable code splitting while maintaining serial execution order. All tests share the same authenticated browser context and page.

To get started, need to run `npx playwright install` and `sudo npx playwright install-deps`

## Running tests

You need to start Foundry and create a world called CampaignBuilderTest before running the tests.  (This was technically when the code used to use the setup page to open the world.  Now it could really be called anything). You should also login to it and install the module.  Then logout - you don't want to be logged in while it runs unless you're a different user than the test user (but you should do an initial login as the test user regardless)

Then open the world and leave it on the login screen.

`npm run test`

## Cleanup

If any of the tests fail, you should delete all the settings that were created.