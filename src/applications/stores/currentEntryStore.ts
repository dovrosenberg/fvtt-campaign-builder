// this store handles the the entry currently being displayed

// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { WorldFlags, WorldFlagKey } from '@/settings/WorldFlags';
import { cleanTrees, hasHierarchy, Hierarchy, } from '@/utils/hierarchy';
import { useDirectoryStore, useNavigationStore, useMainStore } from '@/applications/stores';
import { getTopicText, } from '@/compendia';
import { inputDialog } from '@/dialogs/input';
import { DOCUMENT_TYPES, Entry } from '@/documents';

// types
import { Topic, ValidTopic } from '@/types';

// the store definition
export const useCurrentEntryStore = defineStore('CurrentEntry', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const directoryStore = useDirectoryStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { currentWorldId, currentTopicJournals, currentWorldCompendium, } = storeToRefs(mainStore);
  
  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
   
  ///////////////////////////////
  // actions
  const updateEntryType = async (entryId: string, typeName: string): Promise<void> => {
    const entry = await fromUuid(entryId) as Entry;
    const oldType = (entry.system.type as string | null | undefined) || '';
    await entry.update({ 'system.type': typeName });

    await directoryStore.updateEntryType(entry, oldType);
  };

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

    // unlock it to make the change
    await currentWorldCompendium.value.configure({locked:false});

    // create the entry
    const entry = await JournalEntryPage.createDocuments([{
      type: DOCUMENT_TYPES.Entry,
      name: nameToUse,
      system: {
        type: options.type || '',
        topic: topic,
        relationships: {
          [Topic.Character]: {},
          [Topic.Event]: {},
          [Topic.Location]: {},
          [Topic.Organization]: {},
        }
      }
    }],{
      parent: currentTopicJournals.value[topic],
      // pack: currentWorldCompendium.value.metadata.id,
    });

    await currentWorldCompendium.value.configure({locked:true});

    if (entry) {
      // we always add a hierarchy, because we use it for filtering
      await WorldFlags.setHierarchy(worldFolder.uuid, entry[0].uuid, {
        parentId: '',
        ancestors: [],
        children: [],
        type: '',
      } as Hierarchy);

      // set parent if specified
      if (options.parentId==undefined) {
        // no parent - set as a top node
        const topNodes = WorldFlags.getTopicFlag(worldFolder.uuid, WorldFlagKey.topNodes, topic);
        await WorldFlags.setTopicFlag(worldFolder.uuid, WorldFlagKey.topNodes, topic, topNodes.concat([entry[0].uuid]));
      } else {
        // add to the tree
        if (hasHierarchy(topic)) {
          // this creates the proper hierarchy
          await directoryStore.setNodeParent(topic, entry[0].uuid, options.parentId);
        }
      }

      await directoryStore.refreshCurrentTrees(options.parentId ? [options.parentId, entry[0].uuid] : [entry[0].uuid]);
    }
   
    return entry ? entry[0] : null;
  };

  // delete an entry from the world
  const deleteEntry = async (topic: ValidTopic, entryId: string) => {
    const entry = await fromUuid(entryId) as Entry;

    if (!entry || !currentWorldId.value)
      return;

    // have to unlock the pack
    await currentWorldCompendium.value.configure({locked:false});

    const hierarchy = WorldFlags.getHierarchy(currentWorldId.value, entry.uuid);

    if (hierarchy) {
      // delete from any trees
      if (hierarchy?.ancestors || hierarchy?.children) {
        await cleanTrees(currentWorldId.value, topic, entry.uuid, hierarchy);
      }
    }

    // remove from the top nodes
    const topNodes = WorldFlags.getTopicFlag(currentWorldId.value, WorldFlagKey.topNodes, topic);
    await WorldFlags.setTopicFlag(currentWorldId.value, WorldFlagKey.topNodes, topic, topNodes.filter((id) => id !== entry.uuid));

    await entry.delete();

    await currentWorldCompendium.value.configure({locked:true});

    // TODO - remove from any relationships
    // TODO - remove from search

    // update tabs
    await navigationStore.cleanupDeletedEntry(entry.uuid);

    // refresh and force its parent to update
    await directoryStore.refreshCurrentTrees(hierarchy?.parentId ? [hierarchy?.parentId] : []);
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
    updateEntryType,
    createEntry,
    deleteEntry,
  };
});