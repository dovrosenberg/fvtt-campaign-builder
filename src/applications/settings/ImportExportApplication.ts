import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/ImportExportDialog.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let importExportApp: ImportExportApplication | null = null;

export class ImportExportApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); importExportApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-import-export`,
    classes: ['fcb-import-export', 'fcb-window'],
    window: {
      title: 'fcb.applications.importExport.title',
      icon: 'fa-solid fa-file-import',
      resizable: true,
    },
    position: {
      width: 500,
      height: "auto" as const,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-import-export-app',
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
