import moduleJson from '@module';
import { VueApplicationMixin } from '@/libs/VueApplicationMixin.mjs';

import App from '@/templates/WorldBuilder.vue';

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

export class WorldBuilderApplication extends VueApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: `app-${moduleJson.id}-VueExamples`,
    window: {
      title: `${moduleJson.id}.title`,
      icon: 'fa-solid fa-triangle-exclamation'
    },
    position: {
      width: 880,
      height: 'auto'
    },
    actions: {}
  }, { inplace: false });

  static DEBUG = true;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'app',
      component: App,
      props: {
        title: 'sample title',
        content: 'initial content',
      }
      // use: {
      //   'quasar': { plugin: Quasar }
      // }
    }
  };
}
