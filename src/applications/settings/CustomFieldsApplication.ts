import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/CustomFieldsDialog.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let customFieldsApp: CustomFieldsApplication | null = null;

export class CustomFieldsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); customFieldsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-custom-fields`,
    classes: ['fcb-custom-fields', 'fcb-window'],
    window: {
      title: 'fcb.settings.customFields',
      icon: 'fa-solid fa-list',
      resizable: true,
    },
    position: {
      width: 900,
      height: 650,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-custom-fields-app',
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
