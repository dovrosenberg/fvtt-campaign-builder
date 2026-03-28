// -------------------------------- //
// Quench Unit Testing              //
// -------------------------------- //

import { registerClassBatches } from '@unittest/classes';
import { registerUtilBatches } from '@unittest/utils';
import { registerStoreBatches } from '@unittest/applications/stores';
import { registerModuleSettingsBatch } from '@unittest/settings';
import { registerComponentBatches } from '@unittest/components';

// Registers all `Quench` tests
// @ts-ignore - hooks overload confuses it
Hooks.on('quenchReady' as any, (quench: any): void => {
  // Store the quench object globally for test automation
  (window as any).quenchObject = quench;
  (window as any).quenchTestsRegistered = true;
  
  // Register individual batches so users can select which to run
  // Register alphabetically for ease of finding
  
  // Classes
  registerClassBatches();  
  
  // Components
  registerComponentBatches();

  // Settings
  registerModuleSettingsBatch();
  
  // Stores
  registerStoreBatches();

  // Utils
  registerUtilBatches();    
});

// Capture test results as JSON for LLM debugging
// @ts-ignore - hooks overload confuses it
Hooks.on('quenchReports' as any, (reports: { json: string }): void => {
  // Log with a distinctive prefix for easy capture by Playwright
  console.log('QUENCH_JSON_REPORT_START');
  const objectResults = { failures: JSON.parse(reports.json)?.failures || [] };
  console.debug(JSON.stringify(objectResults));
  console.log('QUENCH_JSON_REPORT_END');
  
  // Also store globally for direct access
  (window as any).quenchJsonReport = reports.json;
});