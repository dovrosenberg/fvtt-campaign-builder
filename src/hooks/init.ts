import { moduleId, ModuleSettings, updateModuleSettings } from '@/settings';
import { DOCUMENT_TYPES, EntryDataModel, SessionDataModel } from '@/documents';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // initialize settings first, so other things can use them
  updateModuleSettings(new ModuleSettings());  

  // register the data models
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [DOCUMENT_TYPES.Entry]: EntryDataModel,
    [DOCUMENT_TYPES.Session]: SessionDataModel
  });

  DocumentSheetConfig.registerSheet(JournalEntryPage, moduleId, JournalPageSheet, {
    types: [DOCUMENT_TYPES.Entry],
    makeDefault: true
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, moduleId, JournalPageSheet, {
    types: [DOCUMENT_TYPES.Session],
    makeDefault: true
  });
}
