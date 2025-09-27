import { moduleId, ModuleSettings, } from '@/settings';
import { KeyBindings } from '@/settings/KeyBindings';
import { DOCUMENT_TYPES, EntryDataModel, SessionDataModel, PCDataModel } from '@/documents';
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
    // [DOCUMENT_TYPES.PC]: PCDataModel, // Deprecated in v1.2+
  });

  
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntry, moduleId, CampaignBuilderApplication, {
    canBeDefault: false,
    canConfigure: false,
    makeDefault: false,
    label: 'FCB - IF YOU\'RE SEEING THIS SOMETHING IS BROKEN'
  });
}
