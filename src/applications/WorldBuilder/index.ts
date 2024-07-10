// the solo instance
export let worldBuilder: WorldBuilderApplication;

// set the main application; should only be called once
export function updateWorldBuilder(newWorldBuilder: WorldBuilderApplication): void {
  worldBuilder = newWorldBuilder;
}

import moduleJson from '@module';
import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import { createPinia, setActivePinia } from 'pinia';
import App from '@/components/WorldBuilder.vue';

const { ApplicationV2 } = foundry.applications.api;

// // Setup Vuetify
// const vuetify = createVuetify({
// 	components,
// 	directives,
// })

/////////////////
// Quasar UI
// import { Quasar } from 'quasar';

// Import Quasar css
// import 'quasar/src/css/index.sass';

// setup pinia
const pinia = createPinia();
setActivePinia(pinia);

export class WorldBuilderApplication extends VueApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: `app-${moduleJson.id}-WorldBuilder`,
    classes: ['fwb-main-window'], 
    window: {
      title: 'fwb.title',
      icon: 'fa-solid fa-triangle-exclamation',
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
      closeOnSubmit: false,
      submitOnChange: true,
      // submitOnClose: false,
    },
    actions: {}
  }, { inplace: false });

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
      //   'quasar': { plugin: Quasar }
      }
    }
  };
}
