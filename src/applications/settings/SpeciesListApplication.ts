import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import PrimeVue from 'primevue/config';
import WCBTheme from '@/applications/presetTheme';

import App from '@/components/applications/SpeciesList.vue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let speciesListApp: SpeciesListApplication | null = null;

export class SpeciesListApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); speciesListApp = this;}

  static DEFAULT_OPTIONS = {
    id: `app-wcb-species-list`,
    classes: ['wcb-species-list'], 
    window: {
      title: 'wcb.applications.speciesList.title',
      icon: 'fa-solid fa-person-half-dress',
      resizable: true,
      // popOut: true,
      // editable: true,
      // //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      // scrollY: ['ol.wcb-world-list']
    },
    position: {
      width: 800,
    },
    form: {
      // closeOnSubmit: false,
      submitOnChange: true,
      // submitOnClose: false,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'wcb-species-list-app',
      component: App,
      props: {},
      use: {
        primevue: { 
          plugin: PrimeVue, 
          options: {
            theme: { 
              preset: WCBTheme,
              options: {
                // prefix: 'wcb-p',
                // cssLayer: {
                //   name: 'wcb-p',
                //   order: 'wcb-p',
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
