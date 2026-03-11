import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/AssociationTagsDialog.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let associationTagsApp: AssociationTagsApplication | null = null;

export class AssociationTagsApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { 
    super(); 
    associationTagsApp = this;
  }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-association-tags`,
    classes: ['fcb-association-tags', 'fcb-window'], 
    window: {
      title: 'fcb.applications.associationTags.title',
      icon: 'fa-solid fa-tags',
      resizable: true,
    },
    position: {
      width: 800,
      height: 600
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
      id: 'fcb-association-tags-app',
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
