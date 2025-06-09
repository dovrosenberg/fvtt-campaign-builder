import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/AdvancedSettings.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let advancedSettingsApp: AdvancedSettingsApplication | null = null;

export class AdvancedSettingsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); advancedSettingsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-advanced-settings`,
    classes: ['fcb-advanced-settings'], 
    window: {
      title: 'fcb.applications.advancedSettings.title',
      icon: 'fa-solid fa-gear',
      resizable: false,
      // popOut: true,
      // editable: true,
      // //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      // scrollY: ['ol.fcb-setting-list']
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
      id: 'fcb-advanced-settings-app',
      component: App,
      props: {},
      use: {
        primevue: { 
          plugin: PrimeVue, 
          options: {
            theme: theme
          }
        },
      }
    }
  };
}
