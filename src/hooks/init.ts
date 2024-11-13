import moduleJson from '@module';
import { ModuleSettings, updateModuleSettings } from '@/settings/ModuleSettings';
import { DocumentTypes, EntryDataModel } from '@/documents';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // initialize settings first, so other things can use them
  updateModuleSettings(new ModuleSettings());  

  // register the data models
  console.log(`${moduleJson.id}.${DocumentTypes.Entry}`);
  
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [`${moduleJson.id}.${DocumentTypes.Entry}`]: EntryDataModel
  });

  DocumentSheetConfig.registerSheet(JournalEntryPage, moduleJson.id, JournalPageSheet, {
    types: [`${moduleJson.id}.${DocumentTypes.Entry}`],
    makeDefault: true
  });
}
