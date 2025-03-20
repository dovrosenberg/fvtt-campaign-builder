import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import WCBTheme from '@/applications/presetTheme';

import App from '@/components/applications/WorldBuilder.vue';

const { ApplicationV2 } = foundry.applications.api;

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';

// setup pinia
const pinia = createPinia();
setActivePinia(pinia);

// the global instance - needed for keybindings, among other things
export let wbApp: WorldBuilderApplication | null = null;

export const getWorldBuilderApp = (): WorldBuilderApplication => {
  if (wbApp)
    return wbApp;

  return wbApp = new WorldBuilderApplication();
};

export class WorldBuilderApplication extends VueApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `app-wcb-WorldBuilder`,
    classes: ['wcb-main-window'], 
    window: {
      title: 'wcb.title',
      icon: 'fa-solid fa-globe',
      resizable: true,
      // popOut: true,
      // editable: true,
      // //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      // scrollY: ['ol.wcb-world-list']
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
      id: 'wcb-app',
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
            theme: { 
              preset: WCBTheme,
              options: {
                // prefix: 'wcb-p',
                // cssLayer: {
                //   name: 'wcb-p',
                //   order: 'wcb-p',
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
