import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/ArcManager.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let arcManagerApp: ArcManagerApplication | null = null;

export class ArcManagerApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { 
    super(); 
    arcManagerApp = this;
  }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-arc-manager`,
    classes: ['fcb-arc-manager'], 
    window: {
      title: 'fcb.applications.arcManager.title',
      icon: 'fa-solid fa-book-open',
      resizable: true,
    },
    position: {
      width: 900,
    },
    form: {
      submitOnChange: true,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-arc-manager-app',
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
