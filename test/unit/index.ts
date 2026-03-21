// -------------------------------- //
// Quench Unit Testing              //
// -------------------------------- //

import { registerEntryBatch } from '@unittest/classes';
import { 
  registerAppWindowBatch,
  registerHierarchyBatch,
  registerRelatedContentBatch,
  registerArcIndexBatch,
  registerCleanKeysBatch,
  registerCustomFieldsBatch,
  registerDirectoryScrollBatch,
  registerDragDropBatch,
  registerNameGeneratorsBatch,
} from '@unittest/utils';
import { registerMainStoreBatch } from '@unittest/applications/stores';
import { registerModuleSettingsBatch } from '@unittest/settings';
import { registerLabelWithHelpBatch } from '@unittest/components';

// Registers all `Quench` tests
Hooks.on('quenchReady' as any, (quench: any): void => {
  // Store the quench object globally for test automation
  (window as any).quenchObject = quench;
  (window as any).quenchTestsRegistered = true;
  
  // Register individual batches so users can select which to run
  // Register alphabetically for each of finding
  
  // Classes
  registerEntryBatch();  
  
  // Components
  registerLabelWithHelpBatch();

  // Settings
  registerModuleSettingsBatch();
  
  // Stores
  registerMainStoreBatch();

  // Utils
  registerAppWindowBatch();
  registerHierarchyBatch();
  registerRelatedContentBatch();
  registerArcIndexBatch();
  registerCleanKeysBatch();
  registerCustomFieldsBatch();
  registerDirectoryScrollBatch();
  registerDragDropBatch();
  registerNameGeneratorsBatch();
    
});

// Capture test results as JSON for LLM debugging
Hooks.on('quenchReports' as any, (reports: { json: string }): void => {
  // Log with a distinctive prefix for easy capture by Playwright
  console.log('QUENCH_JSON_REPORT_START');
  const objectResults = { failures: JSON.parse(reports.json)?.failures || [] };
  console.debug(JSON.stringify(objectResults));
  console.log('QUENCH_JSON_REPORT_END');
  
  // Also store globally for direct access
  (window as any).quenchJsonReport = reports.json;
});