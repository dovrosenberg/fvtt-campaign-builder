import { moduleId, ModuleSettings, } from '@/settings';
import { KeyBindings } from '@/settings/KeyBindings';
import { DOCUMENT_TYPES, EntryDataModel, SessionDataModel, SettingDataModel } from '@/documents';
import { CampaignBuilderApplication } from '@/applications/CampaignBuilder';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // Load Quench test in development environment
  if (import.meta.env.MODE === 'development') {
    await import('@test/index');
  }

  // initialize settings first, so other things can use them
  ModuleSettings.register();

  // put in place the key bindings
  KeyBindings.register();

  // register the data models
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [DOCUMENT_TYPES.Entry]: EntryDataModel,
    [DOCUMENT_TYPES.Session]: SessionDataModel,
    [DOCUMENT_TYPES.Setting]: SettingDataModel,
    // [DOCUMENT_TYPES.PC]: PCDataModel, // Deprecated in v1.2+
  });

  
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntry, moduleId, CampaignBuilderApplication, {
    canBeDefault: false,
    canConfigure: false,
    makeDefault: true,
    label: 'FCB - IF YOU\'RE SEEING THIS SOMETHING IS BROKEN'
  });

  // we need to add the default sheet even though we never use them
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, moduleId, foundry.appv1.sheets.JournalPageSheet, {
    types: [DOCUMENT_TYPES.Entry, DOCUMENT_TYPES.Session, DOCUMENT_TYPES.Setting ],
    makeDefault: true,
  });

  // PC entries are now handled by Entry with topic=PC
  // foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, moduleId, foundry.appv1.sheets.JournalPageSheet, {
  //   types: [DOCUMENT_TYPES.PC],
  //   makeDefault: true
  // });
}
