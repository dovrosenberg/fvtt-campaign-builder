import moduleJson from '@module';
import { ModuleSettings, updateModuleSettings } from '@/settings/ModuleSettings';
import { SessionModel, SessionSheet } from '@/documents/Session';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // initialize settings first, so other things can use them
  updateModuleSettings(new ModuleSettings());  

  // set up custom journal entry types
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [`${moduleJson.id}.session`]: SessionModel
  });
  DocumentSheetConfig.registerSheet(JournalEntryPage, moduleJson.id, SessionSheet, {
    types: [`${moduleJson.id}.session`],
    makeDefault: true
  });

}
