import { moduleId, ModuleSettings, } from '@/settings';
import { KeyBindings } from '@/settings/KeyBindings';
import { CampaignDataModel, DOCUMENT_TYPES, ArcDataModel, FrontDataModel, EntryDataModel, SessionDataModel, SettingDataModel, StoryWebDataModel } from '@/documents';
import { CampaignBuilderApplication } from '@/applications/CampaignBuilder';
import { JournalEntryFlagKey } from '@/settings';

export function registerForInitHook() {
  Hooks.once('init', init);
}

async function init(): Promise<void> {
  // Load Quench test in development environment
  if (import.meta.env.MODE === 'test') {
    await import('@unittest/index');
  }

  // initialize settings first, so other things can use them
  ModuleSettings.register();

  // Initialize reactive settings system to listen for Foundry setting changes
  ModuleSettings.initializeReactivity();

  // put in place the key bindings
  KeyBindings.register();

  // register the data models
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    [DOCUMENT_TYPES.Entry]: EntryDataModel,
    [DOCUMENT_TYPES.Session]: SessionDataModel,  
    [DOCUMENT_TYPES.Arc]: ArcDataModel,  
    [DOCUMENT_TYPES.Campaign]: CampaignDataModel,
    [DOCUMENT_TYPES.Front]: FrontDataModel,
    [DOCUMENT_TYPES.Setting]: SettingDataModel,
    [DOCUMENT_TYPES.StoryWeb]: StoryWebDataModel,
  });

  // register the index fields we need
  CONFIG.JournalEntry.compendiumIndexFields.push(
    `flags.${moduleId}.${JournalEntryFlagKey.campaignBuilderType}`,
    'pages.uuid',
    'pages.name',
    'actorId',  // for PCs
    'pages.system.number',  // for sessions
    'pages.system.topic',  // for entries
    'pages.system.type',  // for entries
  );
    
  // the sheet  
  // @ts-ignore
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntry, moduleId, CampaignBuilderApplication, {
    canBeDefault: false,
    canConfigure: false,
    makeDefault: false,
    label: 'FCB - IF YOU\'RE SEEING THIS SOMETHING IS BROKEN'
  });

  // we need to add these in case someone opens one manually somehow
  // @ts-ignore
  foundry.applications.apps.DocumentSheetConfig.registerSheet(JournalEntryPage, moduleId, CampaignBuilderApplication, {
    types: [DOCUMENT_TYPES.Entry, DOCUMENT_TYPES.Session, DOCUMENT_TYPES.Setting, DOCUMENT_TYPES.Campaign, DOCUMENT_TYPES.Front ],
    makeDefault: true,  // only applies to these types
  });
}