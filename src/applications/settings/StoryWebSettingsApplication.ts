import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/StoryWebSettingsDialog.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let storyWebSettingsApp: StoryWebSettingsApplication | null = null;

export class StoryWebSettingsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); storyWebSettingsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-story-web-settings`,
    classes: ['fcb-story-web-settings', 'fcb-window'],
    window: {
      title: 'fcb.applications.storyWebSettings.title',
      icon: 'fa-solid fa-project-diagram',
      resizable: true,
    },
    position: {
      width: 700,
      height: 600,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-story-web-settings-app',
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
