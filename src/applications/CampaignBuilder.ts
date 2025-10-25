import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';
import { pinia, useNavigationStore, useMainStore } from '@/applications/stores';
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
import { Entry, WindowTab } from '@/classes';
import { UserFlagKey, UserFlags } from '@/settings';
import { WindowTabType } from '@/types';

// setup pinia

// the global instance - needed for keybindings, among other things
export let wbApp: CampaignBuilderApplication | null = null;

// a (hopefully) never used name to indicate opening window without a doc
const FCB_OPEN_WINDOW_NAME = 'FCB-Open-Window!!!@#';


export const renderCampaignBuilderApp = async () => {
  // Check if migration failed - prevent opening if it did
  if (MigrationManager.migrationFailed) {
    notifyError(localize('notifications.migration.cannotOpen'));
    return null;
  }
  
  // wbApp is managed inside _canRender, which gets called both by this as well
  //    as any Foundry attempts to render
  const newWindow = new CampaignBuilderApplication();
  newWindow.render(true);
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

  // Override to prevent DocumentSheetV2 from adding default controls
  override _getHeaderControls() {
    return [];
  }

  private _inMiddleOfRender = false;  // because otherwise we can get stuck in strange loops

  // there are a few general scenarios here:
  // 1. this is just a general rerender call - we disallow it
  // 2. this is a first call for a window, but we already have one open - we disallow it 
  //    but handle the document we're trying to open
  // 3. this is a first call for a window, and we don't have one open - we allow it
  override _canRender(_options): false | void { 
    if (this._inMiddleOfRender)
      return false;
    
    this._inMiddleOfRender = true;

    try {
      // Prevent opening before the ready hook - settingIndex hasn't been populated yet
      // Map notes are somehow automatically trying to open before the ready hook fires
      if (!game.ready) {
        this._inMiddleOfRender = false;
        return false;
      }

      // prevent the window from opening at all if we're trying to open an invalid
      //    doc or we had a failed migration
      if (MigrationManager.migrationFailed) {
        notifyError(localize('notifications.migration.cannotOpen'));
        this._inMiddleOfRender = false;
        return false;
      }

      if (!wbApp) {
        wbApp = this;

        // we hold it here... there's an issue where we can't import this file
        //    into other places that need access to wbApp because it triggers
        //    an issue with pinia reference instantiation order
        // but we need it to be able to close it programatically
        // @ts-ignore
        game.modules.get(moduleId).activeWindow = wbApp;    
      }

      // if we already have a wbApp, don't render another CampaignBuilder
      // we will return false to prevent Foundry from opening another window
      //    but we need to handle the document we're trying to open here otherwise
      //    we can never open a specific document after the first time
      let preventRender = wbApp.rendered;

      const doc = this.document;

      // handle the scenarios where we just need to abort
      if (!doc) {
        this._inMiddleOfRender = false;
        return false;
      }

      const docToCheck = doc.documentName === 'JournalEntryPage' ? doc.parent : doc;

      if (!docToCheck) {
        notifyError('Attempt to open invalid journal entry in Campaign Builder');
        this._inMiddleOfRender = false;
        return false;
      }

      // if it's our fake one, don't worry about other details 
      if (doc.name !== FCB_OPEN_WINDOW_NAME) {
        if (!['JournalEntry', 'JournalEntryPage'].includes(doc.documentName)) {
          notifyError('Attempt to open invalid document in Campaign Builder');
          this._inMiddleOfRender = false;
          return false;
        }

        if (!docToCheck.getFlag(moduleId, JournalEntryFlagKey.campaignBuilderType)) {
          // not FCB
          notifyError('Attempt to open invalid journal entry in Campaign Builder');
          this._inMiddleOfRender = false;
          return false;
        } else if (docToCheck.pages.contents.length === 0) {
          // no pages
          notifyError('Attempt to open invalid journal entry in Campaign Builder');
          this._inMiddleOfRender = false;
          return false;
        }
      }

      // at this point we know this is a first attempt to open the window (though it 
      //    might be a new instance we want to cancel)
      // so we handle the document

      // handle our special one
      if (doc.name === FCB_OPEN_WINDOW_NAME) {
        this._inMiddleOfRender = false;
        return;
      }

      // handle opening any other document
      // this is async, but should be OK
      CampaignBuilderApplication.handleDocument(docToCheck);

      this._inMiddleOfRender = false;
      if (preventRender)
        return false;  // we already had a wbApp open, so don't need another
      else 
        return;  // this is really the first time we're opening any CampaignBuilder
    } catch (e) {
      this._inMiddleOfRender = false;
      throw e;
    }
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

      //  3. we opened it with a FCB journal entry - we handle that in _canRender
    }

    super(finalOptions);
  }

  // called when we first open the window
  // doc must already have been checked to be a FCB entry
  static async handleDocument(incomingDoc: foundry.documents.JournalEntry) {
    let docType = incomingDoc.getFlag(moduleId, JournalEntryFlagKey.campaignBuilderType);
    let doc = incomingDoc;

    // Check if this is a world copy - if so, redirect to the original compendium entry
    const originalUuid = doc.getFlag(moduleId, JournalEntryFlagKey.originalUuid) as string | undefined;
    if (originalUuid && originalUuid !== incomingDoc.uuid) {
      // This is a world copy, load the original compendium entry instead
      const originalDoc = await fromUuid(originalUuid) as foundry.documents.JournalEntry | null;
      if (originalDoc) {
        doc = originalDoc;
      }
    }

    let uuid = doc.uuid; 

    if (!docType || !uuid || !Object.values(DOCUMENT_TYPES).includes(docType))
      throw new Error('Attempt to open invalid journal entry in CampaignBuilderApplication _onFirstRender')

    // Before opening the content, check if it belongs to a different setting
    // If so, create a tab for it in the target setting, then switch settings
    // This avoids a race condition where we try to open content before tabs are loaded
    const mainStore = useMainStore();

    const docSettingId = (new Entry(doc))?.settingId;

    if (mainStore.currentSetting?.uuid !== docSettingId) {
      // Map DOCUMENT_TYPES to WindowTabType
      const docTypeToWindowTabType: Record<string, WindowTabType> = {
        [DOCUMENT_TYPES.Entry]: WindowTabType.Entry,
        [DOCUMENT_TYPES.Campaign]: WindowTabType.Campaign,
        [DOCUMENT_TYPES.Session]: WindowTabType.Session,
        [DOCUMENT_TYPES.Setting]: WindowTabType.Setting,
      };
      
      const windowTabType = docTypeToWindowTabType[docType];
      
      // Load the document metadata using the shared helper
      const metadata = await useNavigationStore().loadContentMetadata(uuid, windowTabType);
      
      const headerData = { uuid: uuid, name: metadata.name, icon: metadata.icon };

      // Create a new tab for this content
      const newTab = new WindowTab(
        true,  // active
        headerData,
        uuid,
        metadata.contentType,
        null,  // generate new ID
        metadata.defaultContentTab
      );

      // Load existing tabs for the target setting
      const existingTabs = UserFlags.get(UserFlagKey.tabs, docSettingId) || [];
      
      // Mark all existing tabs as inactive
      existingTabs.forEach((t: WindowTab) => t.active = false);
      
      // Add the new tab to the front (it will be active)
      existingTabs.push(newTab);
      
      // Save the tabs to the target setting
      await UserFlags.set(UserFlagKey.tabs, existingTabs, docSettingId);
      
      // Now switch settings - loadTabs() will be triggered by the watcher and load our new tab
      await mainStore.setNewSetting(docSettingId);
    } else {
      // Same setting, just open the content normally
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
    }
  } 
}
