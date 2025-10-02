import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';
import { pinia, } from '@/applications/stores';
import App from '@/components/applications/CampaignBuilder.vue';

const { DocumentSheetV2 } = foundry.applications.api;

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';
import '@yaireo/tagify/dist/tagify.css';
import { theme } from '@/components/styles/primeVue';

// setup pinia

// the global instance - needed for keybindings, among other things
export let wbApp: CampaignBuilderApplication | null = null;

// a (hopefully) never used name to indicate opening window without a doc
const FCB_OPEN_WINDOW_NAME = 'FCB-Open-Window!!!@#';

export const getCampaignBuilderApp = (): CampaignBuilderApplication => {
  if (wbApp)
    return wbApp;

  return wbApp = new CampaignBuilderApplication();
};
export class CampaignBuilderApplication extends VueApplicationMixin(DocumentSheetV2<JournalEntry>) {

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

      const doc = finalOptions.document;
      if (doc.name !== FCB_OPEN_WINDOW_NAME) { 
        throw new Error('Attempt to open non-FCB journal entry in CampaignBuilderApplication constructor')
      }

      //  3. we opened it with a FCB journal entry - we want to make sure that content is opened
      //  we handle that in _onFirstRender
    }

    super(finalOptions);
  }

  // called when we first open the window
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // if there is a document, open that content
    const doc = context.document;
    if (doc.type) {
      alert('Need to determine the content type here');
      // useNavigationStore().openContent(doc.uuid);      
    } else if (doc.name !== FCB_OPEN_WINDOW_NAME) {
      throw new Error('Attempt to open invalid journal entry in CampaignBuilderApplication _onFirstRender')
    }

    // if it's false just show the default
  }
}
