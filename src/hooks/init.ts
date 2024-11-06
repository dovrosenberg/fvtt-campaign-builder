import moduleJson from '@module';
import { ModuleSettings, updateModuleSettings } from '@/settings/ModuleSettings';
import { EntryModel } from '@/documents/entry';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // initialize settings first, so other things can use them
  updateModuleSettings(new ModuleSettings());  

  // register the data models
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [`${moduleJson.id}.entry`]: EntryModel
  });

  DocumentSheetConfig.registerSheet(JournalEntryPage, moduleJson.id, JournalPageSheet, {
    types: [`${moduleJson.id}.entry`],
    makeDefault: true
  });
}
