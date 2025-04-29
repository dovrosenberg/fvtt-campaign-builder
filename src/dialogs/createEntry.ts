import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import PrimeVue from 'primevue/config';
import WCBTheme from '@/applications/presetTheme';
import App from '@/components/applications/CreateEntry.vue';
import { hasHierarchy, } from '@/utils/hierarchy';
import { useMainStore } from '@/applications/stores'; 
import { CharacterDetails, LocationDetails, OrganizationDetails, ValidTopic } from '@/types';
import { Entry, TopicFolder } from '@/classes';
import { handleGeneratedEntry } from '@/utils/generation';

const { ApplicationV2 } = foundry.applications.api;


type AnyDetails = CharacterDetails | OrganizationDetails | LocationDetails;

class CreateEntryApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-create-entry`,
    classes: ['fcb-create-entry'], 
    window: {
      title: '',
      icon: '',
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
      callback: async (details: AnyDetails | null) => {
        dialog.close(); 

        const entry = await createdCallback(topicFolder, details);
        await resolve(entry) 
      }        
    };
   
    dialog.render(true, { props });
  });
}

const createdCallback = async (topicFolder: TopicFolder, details: AnyDetails | null): Promise<Entry | null> => {
  const currentWorld = useMainStore().currentWorld;

  if (!currentWorld || !details) 
    return null;

  const entry = await handleGeneratedEntry(details, topicFolder);

  return entry || null;
}

async function createGenerateDialog(topic: ValidTopic, 
  options?: { 
    name?: string;
    type?: string; 
    speciesId?: string;
    parentId?: string;
    description?: string;
  }): Promise<Entry | null> {
  const currentWorld = useMainStore().currentWorld;

  if (!currentWorld) 
    return null;

  const { name, description, type, speciesId, parentId } = options ?? {};

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
      generateMode: true,
      topic: topic, 
      validParents: validParents,
      initialName: name || '',
      initialDescription: description || '',
      initialSpeciesId: speciesId || '',
      initialParentId: parentId || '',
      initialType: type || '',
      callback: (e: Entry | null) => { dialog.close(); resolve(e) }
    };
   
    dialog.render(true, { props });
  });
}

export { 
  createEntryDialog,
  createGenerateDialog,
}

