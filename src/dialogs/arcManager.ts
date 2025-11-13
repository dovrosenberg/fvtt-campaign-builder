import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/ArcManager.vue';
import { theme } from '@/components/styles/primeVue';
import { useMainStore } from '@/applications/stores';

const { ApplicationV2 } = foundry.applications.api;

export class ArcManagerApplication extends VueApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `app-fcb-arc-manager`,
    classes: ['fcb-arc-manager'], 
    window: {
      title: 'fcb.dialogs.arcManager.title',
      icon: 'fa-solid fa-book-open',
      resizable: true,
    },
    position: {
      width: 900,
    },
    form: {
      submitOnChange: false,
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

async function arcManagerDialog(campaignId: string): Promise<void> {
  const currentSetting = useMainStore().currentSetting;

  if (!currentSetting) 
    return;

  return new Promise<void>((resolve) => {
    const dialog = new ArcManagerApplication();

    const props = {
      campaignId: campaignId,
      callback: async () => {
        dialog.close();
        resolve();
      }
    };

    dialog.render({ force: true, props });
  });
}

export { 
  arcManagerDialog
}