import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import PrimeVue from 'primevue/config';
import WCBTheme from '@/applications/presetTheme';

import App from '@/components/AIGeneration/GenerateDialog.vue';

import { CreatedCharacterDetails, CreatedLocationDetails, CreatedOrganizationDetails, Topics, ValidTopic } from '@/types';

// the fields that can be completed in the dialog
type CreatedDetails = CreatedCharacterDetails | CreatedOrganizationDetails | CreatedLocationDetails;

async function createEntryDialog(topic: Topics.Character): Promise<CreatedCharacterDetails>;
async function createEntryDialog(topic: Topics.Location): Promise<CreatedCharacterDetails>;
async function createEntryDialog(topic: Topics.Location): Promise<CreatedOrganizationDetails>;
async function createEntryDialog(topic: ValidTopic): Promise<CreatedDetails> => {
  // throw up the dialog


}


const { ApplicationV2 } = foundry.applications.api;

class GenerateEntryApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-generate-entry`,
    classes: ['fcb-generate-entry'], 
    window: {
      title: 'fcb.applications.generateEntry.title',
      icon: 'fa-solid fa-gear',
      resizable: false,
      // popOut: true,
      // editable: true,
      // //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      // scrollY: ['ol.fcb-world-list']
    },
    position: {
      // width: 600,
      // height: 300,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-generate-entry-app',
      component: App,
      props: {},
      use: {
        primevue: { 
          plugin: PrimeVue, 
          options: {
            theme: { 
              preset: WCBTheme,
              options: {
                // prefix: 'fcb-p',
                // cssLayer: {
                //   name: 'fcb-p',
                //   order: 'fcb-p',
                // },
                //darkModeSelector: '.theme-dark'
              }
            }
          }
        },
      }
    }
  };
}

export { 
  createEntryDialog,
}