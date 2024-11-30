// this store handles the the entry currently being displayed

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { ref } from 'vue';

// local imports
import { WorldFlags, WorldFlagKey } from '@/settings/WorldFlags';
import { hasHierarchy, Hierarchy, } from '@/utils/hierarchy';
import { useTopicDirectoryStore, useNavigationStore, useMainStore } from '@/applications/stores';
import { getTopicText, } from '@/compendia';
import { inputDialog } from '@/dialogs/input';

// types
import { ValidTopic } from '@/types';
import { Entry } from '@/classes';

// the store definition
export const useCurrentEntryStore = defineStore('CurrentEntry', () => {
  ///////////////////////////////
  // the state
  // the currently selected tab for the entry
  const currentTopicTab = ref<string | null>(null);

  ///////////////////////////////
  // other stores
  const directoryStore = useTopicDirectoryStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { currentWorldId, currentTopicJournals, currentWorldCompendium, } = storeToRefs(mainStore);
  
  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
   
  ///////////////////////////////
  // actions
  // creates a new entry in the proper compendium in the given world
  // if name is populated will skip the dialog
  type CreateEntryOptions = { name?: string; type?: string; parentId?: string};
  const createEntry = async (worldFolder: Folder, topic: ValidTopic, options: CreateEntryOptions): Promise<Entry | null> => {
    if (!currentTopicJournals.value || !currentTopicJournals.value[topic])
      return null;

    const topicText = getTopicText(topic);

    let nameToUse = options.name || '' as string | null;
    while (nameToUse==='') {  // if hit ok, must have a value
      nameToUse = await inputDialog(`Create ${topicText}`, `${topicText} Name:`);
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameToUse)
      return null;

    // create the entry
    const entry = await Entry.create(currentWorldCompendium.value, currentTopicJournals.value[topic], nameToUse, options.type, topic);

    if (entry) {
      const uuid = entry.uuid;

      // we always add a hierarchy, because we use it for filtering
      await WorldFlags.setHierarchy(worldFolder.uuid, uuid, {
        parentId: '',
        ancestors: [],
        children: [],
        type: '',
      } as Hierarchy);

      // set parent if specified
      if (options.parentId==undefined) {
        // no parent - set as a top node
        const topNodes = WorldFlags.getTopicFlag(worldFolder.uuid, WorldFlagKey.topNodes, topic);
        await WorldFlags.setTopicFlag(worldFolder.uuid, WorldFlagKey.topNodes, topic, topNodes.concat([uuid]));
      } else {
        // add to the tree
        if (hasHierarchy(topic)) {
          // this creates the proper hierarchy
          await directoryStore.setNodeParent(topic, uuid, options.parentId);
        }
      }

      await directoryStore.refreshTopicDirectoryTree(options.parentId ? [options.parentId, uuid] : [uuid]);
    }
   
    return entry ? entry : null;
  };

  // delete an entry from the world
  const deleteEntry = async (topic: ValidTopic, entryId: string) => {
    if (!currentWorldId.value)
      return;

    const hierarchy = WorldFlags.getHierarchy(currentWorldId.value, entryId);

    Entry.deleteEntry(currentWorldId.value, topic, entryId);

    // update tabs
    await navigationStore.cleanupDeletedEntry(entryId);

    // refresh and force its parent to update
    await directoryStore.refreshTopicDirectoryTree(hierarchy?.parentId ? [hierarchy?.parentId] : []);
  };


  ///////////////////////////////
  // computed state
  
  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // watchers
  
  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    currentTopicTab,

    createEntry,
    deleteEntry,
  };
});