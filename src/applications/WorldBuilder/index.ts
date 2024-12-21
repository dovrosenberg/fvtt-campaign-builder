import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import { moduleId } from '@/settings';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import FWBTheme from './presetTheme';

import App from '@/components/WorldBuilder.vue';

const { ApplicationV2 } = foundry.applications.api;

import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';

// setup pinia
const pinia = createPinia();
setActivePinia(pinia);

export class WorldBuilderApplication extends VueApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: `app-${moduleId}-WorldBuilder`,
    classes: ['fwb-main-window'], 
    window: {
      title: 'fwb.title',
      icon: 'fa-solid fa-globe',
      resizable: true,
      // popOut: true,
      // editable: true,
      // //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      // scrollY: ['ol.fwb-world-list']
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
      id: 'fwb-app',
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
              preset: FWBTheme,
              options: {
                // prefix: 'fwb-p',
                // cssLayer: {
                //   name: 'fwb-p',
                //   order: 'fwb-p',
                // },
                darkModeSelector: '.theme-dark'
              }
            }
          }
        },
      }
    }
  };
}
