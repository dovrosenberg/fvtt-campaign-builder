#!/usr/bin/env node

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Configuration
const FOUNDRY_URL = 'http://localhost:30000';

// Ensure test-results directory exists
const outputDir = path.join(process.cwd(), 'test-results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function runQuenchTestsSimple() {
  console.log('Running Quench tests...');
  
  // Launch browser in headless mode
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security'
    ]
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate directly to the game page
    console.log('Navigating to FoundryVTT game...');
    await page.goto(`${FOUNDRY_URL}/game`);
    
    // Wait for FoundryVTT to be ready
    console.log('Waiting for FoundryVTT to initialize...');
    
    // Check if we need to log in
    const needsLogin = await page.evaluate(() => {
      return window.location.pathname.includes('/join') || !window.game;
    });
    
    if (needsLogin) {
      console.log('Need to log in...');
      await page.goto(`${FOUNDRY_URL}/join`);
      
      // First check what users are available
      const availableUsers = await page.locator('select[name="userid"] option').allTextContents();
      console.log('Available users:', availableUsers);
      
      // Select the test user
      await page.selectOption('select[name="userid"]', { label: 'TestUser' });
      
      // Enter password
      await page.fill('input[name="password"]', 'test123');
      
      // Submit
      await page.click('button[name="join"]');
      
      // Wait for redirect
      await page.waitForURL('**/game', { timeout: 5000 });
    }
    
    // Wait for game to be ready
    console.log('Waiting for FoundryVTT to initialize...');
    
    let gameReady = false;
    let attempts = 0;
    
    while (!gameReady && attempts < 60) {  // Increased timeout
      try {
        // Wait for navigation to complete
        await page.waitForLoadState('networkidle', { timeout: 1000 }).catch(() => {});
        
        const debugInfo = await page.evaluate(() => {
          return {
            hasGame: !!window.game,
            gameReady: window.game?.ready,
            hasQuench: !!window.quench,
            quenchReady: window.quench?.ready,
            testsRegistered: window.quenchTestsRegistered,
            hasQuenchObject: !!window.quenchObject,
            hasRunBatches: !!(window.quenchObject || window.quench)?.runBatches,
            location: window.location.pathname,
            title: document.title
          };
        });
        
        // Log debug info every 10 attempts
        if (attempts % 10 === 0) {
          console.log(`Debug (${attempts}/60):`, debugInfo);
        }
        
        gameReady = debugInfo.hasGame && debugInfo.gameReady && debugInfo.hasQuench && debugInfo.testsRegistered && debugInfo.hasQuenchObject && debugInfo.hasRunBatches;
        
        // If we have everything but game isn't ready, let's check what's happening
        if (debugInfo.hasGame && !debugInfo.gameReady && debugInfo.hasQuench) {
          // Check if game is initializing
          const gameState = await page.evaluate(() => {
            if (window.game) {
              return {
                ready: window.game.ready,
                initializing: window.game.initializing,
                data: window.game.data ? 'loaded' : 'not loaded',
                users: window.game.users ? window.game.users.size : 0,
                scenes: window.game.scenes ? window.game.scenes.size : 0
              };
            }
            return null;
          });
          
          if (attempts % 10 === 0 && gameState) {
            console.log(`Game state:`, gameState);
          }
        }
      } catch (e) {
        // Page might be navigating
      }
      
      if (!gameReady) {
        await page.waitForTimeout(1000);
        attempts++;
      }
    }
    
    if (!gameReady) {
      // Final debug info
      const finalDebug = await page.evaluate(() => {
        return {
          hasGame: !!window.game,
          gameReady: window.game?.ready,
          hasQuench: !!window.quench,
          quenchReady: window.quench?.ready,
          testsRegistered: window.quenchTestsRegistered,
          hasRunBatches: !!window.quench?.runBatches,
          location: window.location.pathname,
          title: document.title,
          gameData: window.game ? {
            ready: window.game.ready,
            version: window.game.version,
            data: window.game.data ? 'exists' : 'missing'
          } : 'no game'
        };
      });
      
      console.log('\nFinal debug info:');
      console.log(JSON.stringify(finalDebug, null, 2));
      
      throw new Error('Game not ready after 60 seconds');
    }
    
    console.log('Game is ready, running tests via UI...');
    
    // Add a small delay to ensure everything is settled
    await page.waitForTimeout(2000);
    
    // Click the Quench UI button to open the test interface
    console.log('Looking for Quench button...');
    
    // Check if the button exists
      const buttonExists = await page.locator('.ui-control.quench-button').isVisible();
      console.log('Quench button visible:', buttonExists);
      
      if (!buttonExists) {
        // Try alternative selectors
        const altButton = await page.locator('button[title*="Quench"], button[data-tooltip*="Quench"]').first();
        if (await altButton.isVisible()) {
          console.log('Found alternative Quench button');
          await altButton.click();
        } else {
          throw new Error('Quench button not found');
        }
      } else {
        await page.click('.ui-control.quench-button');
      }
    
    // Wait for the Quench UI to open
    console.log('Waiting for Quench UI to open...');
    
    // Take a screenshot after clicking to debug
    await page.screenshot({ path: 'test-results/quench-after-click.png' });
    
    // Try multiple selectors for the Quench window
    await page.waitForSelector('#quench-results, .application#quench-results, form#quench-results', { timeout: 5000 });
    
    // Check for and dismiss any notifications
    try {
      const notifications = await page.locator('#notifications li').all();
      if (notifications.length > 0) {
        console.log('Found notifications:');
        for (let i = 0; i < notifications.length; i++) {
          const text = await notifications[i].textContent();
          const className = await notifications[i].getAttribute('class');
          console.log(`  Notification ${i}: ${text} (class: ${className})`);
        }
        
        // Try clicking the first notification
        await notifications[0].click({ timeout: 5000 });
        // If that doesn't work, try pressing Escape
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('Could not dismiss notifications, trying force click...');
      // Try to force dismiss the notification
      await page.locator('#notifications li').first().click({ force: true, timeout: 5000 });
    }
    
    // Wait a bit for the tests to load in the UI
    await page.waitForTimeout(2000);
    
    // Select all utility test batches
    console.log('Selecting all test batches...');
    
    // Use the "Select All" button first with force
    await page.click('button[data-action="select"][data-select="all"]', { force: true });
    await page.waitForTimeout(1000);
    
    // Then deselect non-utility batches if needed
    const allBatches = await page.locator('#quench-batches-list .test-batch').all();
    console.log(`Found ${allBatches.length} total test batches`);
    
    // Unselect non-utility batches
    for (const batch of allBatches) {
      const batchName = await batch.getAttribute('data-batch');
      if (batchName && !batchName.includes('utils')) {
        const checkbox = batch.locator('input[type="checkbox"]');
        await checkbox.uncheck();
      }
    }
    
    const utilityBatches = await page.locator('#quench-batches-list .test-batch[data-batch*="utils"] input[type="checkbox"]:checked').all();
    console.log(`Selected ${utilityBatches.length} utility test batches`);
    
    // Click the run button
    console.log('Running tests...');
    await page.click('#quench-run[data-action="run"]');
    
    // Wait for tests to complete
    console.log('Waiting for tests to complete...');
    
    // Wait for results to appear - check for stats or results
    await page.waitForFunction(() => {
      const stats = document.querySelector('#quench-results-stats');
      return stats && stats.style.display !== 'none';
    }, { timeout: 60000 });
    
    // Capture the JSON report from the quenchReports hook
    const jsonReport = await page.evaluate(() => {
      return (window).quenchJsonReport || null;
    });
    
    // Save JSON report to file for LLM debugging
    if (jsonReport) {
      const reportPath = path.join(outputDir, 'quench-report.json');
      fs.writeFileSync(reportPath, jsonReport);
      console.log(`JSON report saved to: ${reportPath}`);
      
      // Also save a human-readable summary for quick reference
      const parsedReport = JSON.parse(jsonReport);
      const summaryPath = path.join(outputDir, 'quench-summary.txt');
      let summary = '=== QUENCH TEST SUMMARY ===\n\n';
      
      if (parsedReport.failures && parsedReport.failures.length > 0) {
        summary += 'FAILED TESTS:\n';
        for (const failure of parsedReport.failures) {
          summary += `\n❌ ${failure.fullTitle}\n`;
          summary += `   ${failure.err.message}\n`;
          if (failure.err.stack) {
            summary += `   Stack: ${failure.err.stack.split('\n').slice(0, 3).join('\n   ')}\n`;
          }
        }
        summary += '\n';
      }
      
      summary += `Stats: ${parsedReport.stats?.passes || 0} passed, ${parsedReport.stats?.failures || 0} failed, ${parsedReport.stats?.pending || 0} pending\n`;
      fs.writeFileSync(summaryPath, summary);
      console.log(`Summary saved to: ${summaryPath}`);
    }
    
    // Extract results from the UI
    const results = await page.evaluate(() => {
      const testResults = [];
      const batchElements = document.querySelectorAll('#quench-batches-list .test-batch');
      
      batchElements.forEach(element => {
        const label = element.querySelector('label');
        const name = label ? label.textContent.trim() : 'Unknown';
        
        // Check if batch has results (class will change based on pass/fail)
        const statusClass = element.className;
        let status = 'skipped'; // Default if not run
        
        if (statusClass.includes('passed')) {
          status = 'passed';
        } else if (statusClass.includes('failed')) {
          status = 'failed';
        }
        
        // Look for error details if failed
        const errors = [];
        if (status === 'failed') {
          const errorElements = element.querySelectorAll('.test-error, .error-message');
          errorElements.forEach(el => {
            const errorText = el.textContent.trim();
            if (errorText) errors.push(errorText);
          });
        }
        
        testResults.push({
          name,
          status,
          errors
        });
      });
      
      return testResults;
    });
    
    // Display results
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    console.log('\n=== QUENCH TEST RESULTS ===');
    console.log(`Total: ${results.length}, Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`);
    
    if (failed > 0) {
      console.log('\n=== FAILED TESTS ===');
      results.filter(r => r.status === 'failed').forEach(test => {
        console.log(`❌ ${test.name}`);
        if (test.errors && test.errors.length > 0) {
          test.errors.forEach(error => {
            console.log(`   ${error}`);
          });
        }
        console.log('');
      });
    }
    
    // Show all test results
    console.log('\n=== ALL TEST RESULTS ===');
    results.forEach(test => {
      const status = test.status === 'passed' ? '✅' : 
                     test.status === 'failed' ? '❌' : '⏭️';
      console.log(`${status} ${test.name}`);
      
      if (test.status === 'failed' && test.errors) {
        test.errors.forEach(error => console.log(`   ${error}`));
      }
    });
    
    return { success: failed === 0, results };
    
  } finally {
    await browser.close();
  }
}

// Run it
runQuenchTestsSimple().then(result => {
  if (result.success) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
