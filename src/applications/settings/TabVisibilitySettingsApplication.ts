import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/TabVisibilitySettingsDialog.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let tabVisibilitySettingsApp: TabVisibilitySettingsApplication | null = null;

export class TabVisibilitySettingsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); tabVisibilitySettingsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-tab-visibility-settings`,
    classes: ['fcb-tab-visibility-settings', 'fcb-window'],
    window: {
      title: 'fcb.settings.tabVisibility',
      icon: 'fa-solid fa-folder-tree',
      resizable: true,
    },
    position: {
      width: 700,
      height: "auto" as const,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-tab-visibility-settings-app',
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
