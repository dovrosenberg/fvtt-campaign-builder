import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import PrimeVue from 'primevue/config';
import WCBTheme from '@/applications/presetTheme';
import App from '@/components/applications/CreateEntryDialog.vue';
import { hasHierarchy, } from '@/utils/hierarchy';
import { useMainStore, useTopicDirectoryStore, useRelationshipStore, useNavigationStore } from '@/applications/stores'; 
import { CharacterDetails, LocationDetails, OrganizationDetails, Topics, ValidTopic } from '@/types';
import { Entry, TopicFolder } from '@/classes';
import { generateImage, handleGeneratedEntry } from '@/utils/generation';
import { localize } from '@/utils/game';

const { ApplicationV2 } = foundry.applications.api;


type AnyDetails = CharacterDetails | OrganizationDetails | LocationDetails;

const createTitles = {
  [Topics.Character]: 'applications.createEntry.titles.create.character',
  [Topics.Location]: 'applications.createEntry.titles.create.location',
  [Topics.Organization]: 'applications.createEntry.titles.create.organization',
}
const generateTitles = {
  [Topics.Character]: 'applications.createEntry.titles.create.character',
  [Topics.Location]: 'applications.createEntry.titles.create.location',
  [Topics.Organization]: 'applications.createEntry.titles.create.organization',
}

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
  options?: { name?: string; type?: string; parentId?: string }): Promise<Entry | null> {
  const currentWorld = useMainStore().currentWorld;

  if (!currentWorld) 
    return null;

  const { name, type, parentId } = options ?? {};

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
      title: localize(createTitles[topic]),
      initialName: name || '',
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

// used for updating an existing entry
async function updateEntryDialog(entry: Entry): Promise<Entry | null> {
  const currentWorld = useMainStore().currentWorld;

  if (!currentWorld) 
    return null;

  const topic = entry.topic;
  const name = entry.name;
  const type = entry.type;
  const description = entry.description;
  const speciesId = entry.speciesId || '';
  const parentId = hasHierarchy(topic) ? await entry.getParentId() || '' : '';
 
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
      title: localize(generateTitles[topic]),
      validParents: validParents,
      initialName: name || '',
      initialDescription: description || '',
      initialSpeciesId: speciesId || '',
      initialParentId: parentId || '',
      initialType: type || '',
      callback: async (details: AnyDetails | null) => {
        dialog.close(); 

        await updatedCallback(entry, details);
        await resolve(entry);
      }        
    };
   
    dialog.render(true, { props });
  });
}

const updatedCallback = async (entry: Entry, details: AnyDetails | null): Promise<Entry | null> => {
  const currentWorld = useMainStore().currentWorld;
  
  if (!currentWorld || !details || !entry) 
    return null;

  const navigationStore = useNavigationStore();
  const relationshipStore = useRelationshipStore();
  const topicDirectoryStore = useTopicDirectoryStore();
  const mainStore = useMainStore();

  // Update the entry with the generated content
  entry.name = details.name;
  entry.description = details.description;
  entry.type = details.type;

  if (entry.topic===Topics.Character) {
    entry.speciesId = (details as CharacterDetails).speciesId;
  }
  
  if (hasHierarchy(entry.topic)) {
    await topicDirectoryStore.setNodeParent(entry.topicFolder as TopicFolder, entry.uuid, (details as LocationDetails).parentId || null);
  }

  // Save the entry
  await entry.save();

  // Refresh the directory tree to show the updated name
  await topicDirectoryStore.refreshTopicDirectoryTree([entry.uuid]);
  await navigationStore.propagateNameChange(entry.uuid, entry.name);

  // Propagate the name and type changes to all related entries
  await relationshipStore.propagateFieldChange(entry, ['name', 'type']);

  // refresh the current entry
  if (mainStore.currentEntry && mainStore.currentEntry?.uuid === entry.uuid)
    await mainStore.refreshCurrentContent();

  if (details.generateImage)
    void generateImage(await currentWorld, entry);  

  return entry || null;
}

export { 
  createEntryDialog,
  updateEntryDialog,
}

