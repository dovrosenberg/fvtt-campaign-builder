// -------------------------------- //
// Quench Unit Testing              //
// -------------------------------- //

import { SettingKey, ModuleSettings } from '@/settings';
// import { registerClassesTests } from '@unittest/classes';
// import { registerSettingsTests } from '@unittest/settings';
import { 
  registerAppWindowBatch,
  registerHierarchyBatch,
  registerRelatedContentBatch
} from '@unittest/utils';

// Registers all `Quench` tests
Hooks.on('quenchReady' as any, () => {
  // registerClassesTests();
  // registerSettingsTests();
  
  // Register individual batches so users can select which to run
  registerAppWindowBatch();
  registerHierarchyBatch();
  registerRelatedContentBatch();
});

const settings = {};

const backupSettings = () => {
  for (const k of Object.values(SettingKey)) {
    if (typeof k === 'string') {
      settings[k] = ModuleSettings.get(k as SettingKey);
    }
  }
}

const restoreSettings = async () => {
  for (const k of Object.values(SettingKey)) {
    if (typeof k === 'string') {
      await ModuleSettings.set(k as SettingKey, settings[k]);
    }
  }
}

export { 
  backupSettings,
  restoreSettings,
}