import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/TableGroupingSettingsDialog.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let tableGroupingSettingsApp: TableGroupingSettingsApplication | null = null;

export class TableGroupingSettingsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); tableGroupingSettingsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-table-grouping-settings`,
    classes: ['fcb-table-grouping-settings', 'fcb-window'],
    window: {
      title: 'fcb.settings.tableGrouping',
      icon: 'fa-solid fa-table',
      resizable: true,
    },
    position: {
      width: 600,
      height: "auto" as const,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-table-grouping-settings-app',
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
