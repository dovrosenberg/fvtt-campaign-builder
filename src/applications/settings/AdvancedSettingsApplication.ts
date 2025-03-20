import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import PrimeVue from 'primevue/config';
import WCBTheme from '@/applications/presetTheme';

import App from '@/components/applications/AdvancedSettings.vue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let advancedSettingsApp: AdvancedSettingsApplication | null = null;

export class AdvancedSettingsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); advancedSettingsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-wcb-advanced-settings`,
    classes: ['wcb-advanced-settings'], 
    window: {
      title: 'wcb.applications.advancedSettings.title',
      icon: 'fa-solid fa-gear',
      resizable: false,
      // popOut: true,
      // editable: true,
      // //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      // scrollY: ['ol.wcb-world-list']
    },
    position: {
      width: 600,
      // height: 300,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'wcb-advanced-settings-app',
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
