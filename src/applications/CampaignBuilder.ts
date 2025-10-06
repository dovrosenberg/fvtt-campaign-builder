import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';
import { pinia, useNavigationStore, } from '@/applications/stores';
import App from '@/components/applications/CampaignBuilder.vue';

const { DocumentSheetV2 } = foundry.applications.api;

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';
import '@yaireo/tagify/dist/tagify.css';
import { theme } from '@/components/styles/primeVue';
import { JournalEntryFlagKey, moduleId } from '@/settings';
import { DOCUMENT_TYPES } from '@/documents';
import { MigrationManager } from '@/utils/migration';
import { notifyError } from '@/utils/notifications';
import { localize } from '@/utils/game';

// setup pinia

// the global instance - needed for keybindings, among other things
export let wbApp: CampaignBuilderApplication | null = null;

// a (hopefully) never used name to indicate opening window without a doc
const FCB_OPEN_WINDOW_NAME = 'FCB-Open-Window!!!@#';


export const renderCampaignBuilderApp = async (render = false) => {
  // Check if migration failed - prevent opening if it did
  if (MigrationManager.migrationFailed) {
    notifyError(localize('notifications.migration.cannotOpen'));
    return null;
  }
  
  if (!wbApp) {
    wbApp = new CampaignBuilderApplication();
  }

  await wbApp.render(render);

};

export class CampaignBuilderApplication extends VueApplicationMixin(DocumentSheetV2<JournalEntry | JournalEntryPage>) {

  static override DEFAULT_OPTIONS = {
    id: `app-fcb-CampaignBuilder`,
    classes: ['fcb-main-window'], 
    window: {  // this is type ApplicationWindowConfiguration
      title: 'fcb.title',
      icon: 'fa-solid fa-globe',
      resizable: true,
      controls: [],  // hide the default controls
    },
    position: {
      width: 1025,
      height: 700,
    },
    form: {
      submitOnChange: false,
    },
    actions: {} //override the sheet actions
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-app',
      component: App,
      props: {},
      use: {
        pinia: {
          plugin: pinia,
          options: {}
        },
        primevue: { 
          plugin: PrimeVue, 
          options: {
            theme: theme
          }
        },
      }
    }
  };

  _canRender(options) { 
    // prevent the window from opening at all if we're trying to open an invalid
    //    doc or we had a failed migration
    if (MigrationManager.migrationFailed) {
      notifyError(localize('notifications.migration.cannotOpen'));
      return false;
    }

    const doc = this.document;

    if (!doc)
      return false;

    // handle our special one
    if (doc.name === FCB_OPEN_WINDOW_NAME) 
      return true;

    if (!['JournalEntry', 'JournalEntryPage'].includes(doc.documentName)) {
      notifyError('Attempt to open invalid document in Campaign Builder');
      return false;
    }
    const docToCheck = doc.documentName === 'JournalEntryPage' ? doc.parent : doc;

    if (!docToCheck) {
      notifyError('Attempt to open invalid journal entry in Campaign Builder');
      return false;
    }

    if (!docToCheck.getFlag(moduleId, JournalEntryFlagKey.campaignBuilderType)) {
      // not FCB
      notifyError('Attempt to open invalid journal entry in Campaign Builder');
      return false;
    } else if (docToCheck.pages.contents.length === 0) {
      // no pages
      notifyError('Attempt to open invalid journal entry in Campaign Builder');
      return false;
    }
    
    return true;
  }

  constructor(options?: any, ...args: any[]) {
    let finalOptions = options;

    // there are three scenarios here:
    //  1. we opened it with the main button so we don't have a document
    if (!options) {
      // we need to fake a document or the DocumentSheetV2 constructor throws an error
      // we use the name as a flag to know that we're opening the window without a document
      const newDoc = new foundry.documents.JournalEntry({
        name: FCB_OPEN_WINDOW_NAME
      });
      
      // note: we're not saving it to the world :) 
      finalOptions = {
        document: newDoc
      }
    } else {
      //  2. we opened it with a non-FCB journal entry - this shouldn't be possible; we throw an error to prevent opening
      finalOptions = new.target._migrateConstructorParams(options, args);

      //  3. we opened it with a FCB journal entry - we handle that in _onFirstRender
    }

    super(finalOptions);
  }

  // called when we first open the window
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // if there is a document, open that content
    const doc = context.document;
    let docType: typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES] | null = null;

    let uuid: string; 

    // if it's our special one, just open if
    if (doc.name === FCB_OPEN_WINDOW_NAME) {
      return;
    }
    
    // if it's a journalentrypage get the type; if it's a journalentry, pull it from the flag
    // we dont have to validate here because we did it in _canRender
    switch (doc.documentName) {
      case 'JournalEntry':          
        docType = doc.getFlag(moduleId, JournalEntryFlagKey.campaignBuilderType);
        uuid = doc.pages?.contents?.[0]?.uuid;
        break;
      case 'JournalEntryPage':
        docType = doc.type;
        uuid = doc.uuid;
        break;

      default:
        throw new Error('Attempt to open non-journal entry in CampaignBuilderApplication _onFirstRender');
    }

    if (docType) {
      switch (docType) {
        case DOCUMENT_TYPES.Campaign:
          useNavigationStore().openCampaign(uuid);
          break;
        case DOCUMENT_TYPES.Session:
          useNavigationStore().openSession(uuid);
          break;
        case DOCUMENT_TYPES.Setting:
          useNavigationStore().openSetting(uuid);
          break;
        case DOCUMENT_TYPES.Entry:
          useNavigationStore().openEntry(uuid);
          break;
      }
    } else {
      throw new Error('Attempt to open invalid journal entry in CampaignBuilderApplication _onFirstRender')
    }

    // if it's false just show the default
  }
}
