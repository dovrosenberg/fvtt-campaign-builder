import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import PrimeVue from 'primevue/config';
import WCBTheme from '@/applications/presetTheme';
import { pinia } from '@/applications/stores';
import App from '@/components/applications/CampaignBuilder.vue';

const { ApplicationV2 } = foundry.applications.api;

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';

// setup pinia

// the global instance - needed for keybindings, among other things
export let wbApp: CampaignBuilderApplication | null = null;

export const getCampaignBuilderApp = (): CampaignBuilderApplication => {
  if (wbApp)
    return wbApp;

  return wbApp = new CampaignBuilderApplication();
};

export class CampaignBuilderApplication extends VueApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `app-fcb-CampaignBuilder`,
    classes: ['fcb-main-window'], 
    window: {
      title: 'fcb.title',
      icon: 'fa-solid fa-globe',
      resizable: true,
      // popOut: true,
      // editable: true,
      // //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      // scrollY: ['ol.fcb-world-list']
    },
    position: {
      width: 1025,
      height: 700,
    },
    form: {
      // closeOnSubmit: false,
      submitOnChange: true,
      // submitOnClose: false,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-app',
      component: App,
      props: {},
      use: {
        pinia: {
          plugin: pinia,
          options: {}
        },
        primevue: { 
          plugin: PrimeVue, 
          options: {
            // theme: 'none',  -- can do this if you want to just style everything manually; could also define a theme without a preset?
            // for now - trying to just use "unstyled" on all the inputs, buttons, etc. to make it easier to style
            theme: { 
              preset: WCBTheme,
              options: {
                // prefix: 'fcb-p',
                // cssLayer: {
                //   name: 'fcb-p',
                //   order: 'fcb-p',
                // },
                //darkModeSelector: '.theme-dark'
              }
            }
          }
        },
      }
    }
  };
}
