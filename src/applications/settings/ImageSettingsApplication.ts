import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/ImageSettingsDialog.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let imageSettingsApp: ImageSettingsApplication | null = null;

export class ImageSettingsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); imageSettingsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-image-settings`,
    classes: ['fcb-image-settings'],
    window: {
      title: 'fcb.settings.images',
      icon: 'fa-solid fa-image',
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
      id: 'fcb-image-settings-app',
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
