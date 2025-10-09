# E2E Test Architecture

## Overview

This test suite uses **Playwright fixtures** to enable code splitting while maintaining serial execution order. All tests share the same authenticated browser context and page.

To get started, need to run `npx playwright install` and `sudo npx playwright install-deps`

## Running tests

You need to start Foundry and create a world called CampaignBuilderTest before running the tests. You should also login to it and install the module.  Then logout.

`npm run test`
