import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import PrimeVue from 'primevue/config';
import WCBTheme from '@/applications/presetTheme';
import App from '@/components/applications/CreateEntry.vue';
import { hasHierarchy, } from '@/utils/hierarchy';
import { useMainStore } from '@/applications/stores'; 
import { ValidTopic } from '@/types';
import { Entry } from 'src/classes';

const { ApplicationV2 } = foundry.applications.api;

class CreateEntryApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-create-entry`,
    classes: ['fcb-create-entry'], 
    window: {
      title: 'fcb.applications.createEntry.title',
      icon: 'fa-solid fa-gear',
      resizable: false,
      // popOut: true,
      // editable: true,
      // //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      // scrollY: ['ol.fcb-world-list']
    },
    position: {
      // width: 600,
      // height: 300,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-create-entry-app',
      component: App,
      props: {},
      use: {
        primevue: { 
          plugin: PrimeVue, 
          options: {
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

async function createEntryDialog(topic: ValidTopic, 
  options?: { type?: string; parentId?: string }): Promise<Entry | null> {
  const currentWorld = useMainStore().currentWorld;

  if (!currentWorld) 
    return null;

  const { type, parentId } = options ?? {};

  // get the valid parents
  let validParents = [] as { id: string; label: string }[];
  const topicFolder = currentWorld.topicFolders[topic];

  if (topicFolder && hasHierarchy(topic)) {
    validParents = topicFolder
      .allEntries().map((e: Entry)=>({ label: e.name, id: e.uuid}));
  }
  
  // construct a promise that returns when the callback is called
  return new Promise<Entry | null>((resolve) => {
    const dialog = new CreateEntryApplication();

    const props = { 
      topic: topic, 
      validParents: validParents,
      initialParentId: parentId || '',
      initialType: type || '',
      callback: (e: Entry | null) => { dialog.close(); resolve(e) }
    };
   
    dialog.render(true, { props });
  });
}

export { 
  createEntryDialog,
}

