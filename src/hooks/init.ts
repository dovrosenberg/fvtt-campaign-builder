import { moduleId, ModuleSettings, } from '@/settings';
import { KeyBindings } from '@/settings/KeyBindings';
import { DOCUMENT_TYPES, EntryDataModel, SessionDataModel, PCDataModel } from '@/documents';
import { Backend, ExternalAPI } from '@/classes';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // initialize settings first, so other things can use them
  ModuleSettings.register();

  // put in place the key bindings
  KeyBindings.register();

  // check the backend
  await Backend.configure();
  
  // Mount the external API
  const module = game.modules.get(moduleId);
  module.api = new ExternalAPI();

  // register the data models
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [DOCUMENT_TYPES.Entry]: EntryDataModel,
    [DOCUMENT_TYPES.Session]: SessionDataModel,
    [DOCUMENT_TYPES.PC]: PCDataModel,
  });

  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, moduleId, foundry.appv1.sheets.JournalPageSheet, {
    types: [DOCUMENT_TYPES.Entry],
    makeDefault: true
  });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, moduleId, foundry.appv1.sheets.JournalPageSheet, {
    types: [DOCUMENT_TYPES.Session],
    makeDefault: true
  });
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, moduleId, foundry.appv1.sheets.JournalPageSheet, {
    types: [DOCUMENT_TYPES.PC],
    makeDefault: true
  });
}
