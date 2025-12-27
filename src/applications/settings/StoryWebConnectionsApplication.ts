import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/StoryWebConnectionsDialog.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let storyWebConnectionsApp: StoryWebConnectionsApplication | null = null;

export class StoryWebConnectionsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); storyWebConnectionsApp = this; }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-story-graph-connections`,
    classes: ['fcb-story-graph-connections', 'fcb-window'],
    window: {
      title: 'fcb.settings.storyWebConnections',
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
      id: 'fcb-story-graph-connections-app',
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
