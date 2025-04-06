import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import PrimeVue from 'primevue/config';
import WCBTheme from '@/applications/presetTheme';

import App from '@/components/applications/RollTableSettings.vue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let rollTableSettingsApp: RollTableSettingsApplication | null = null;

export class RollTableSettingsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); rollTableSettingsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-roll-table-settings`,
    classes: ['fcb-roll-table-settings'],
    window: {
      title: 'fcb.settings.rollTableSettings',
      icon: 'fa-solid fa-dice',
      resizable: false,
    },
    position: {
      width: 600,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-roll-table-settings-app',
      component: App,
      props: {},
      use: {
        primevue: {
          plugin: PrimeVue,
          options: {
            theme: {
              preset: WCBTheme,
              options: {}
            }
          }
        },
      }
    }
  };
}