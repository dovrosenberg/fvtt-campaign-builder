// this store handles the the entry currently being displayed

// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { WorldFlags, WorldFlagKey } from '@/settings/WorldFlags';
import { cleanTrees, hasHierarchy, Hierarchy, } from '@/utils/hierarchy';
import { useDirectoryStore, useNavigationStore, useMainStore } from '@/applications/stores';
import { getTopicText, } from '@/compendia';
import { inputDialog } from '@/dialogs/input';
import { DocumentTypes } from '@/documents';

// types
import { ValidTopic } from '@/types';

// the store definition
export const useCurrentEntryStore = defineStore('CurrentEntry', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const directoryStore = useDirectoryStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { currentWorldId, currentJournals, currentWorldCompendium, currentWorldFolderId } = storeToRefs(mainStore);
  
  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
   
  ///////////////////////////////
  // actions
  const updateEntryType = async (entryId: string, typeName: string): Promise<void> => {
    const entry = await fromUuid(entryId) as JournalEntryPage;
    const oldType = (entry.system.type as string | null | undefined) || '';
    await entry.update({ 'system.type': typeName });

    await directoryStore.updateEntryType(entry, oldType, typeName);
  };

  // creates a new entry in the proper compendium in the given world
  // if name is populated will skip the dialog
  type CreateEntryOptions = { name?: string; type?: string; parentId?: string};
  const createEntry = async (worldFolder: Folder, topic: ValidTopic, options: CreateEntryOptions): Promise<JournalEntryPage | null> => {
    if (!currentJournals.value[topic])
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
      type: DocumentTypes.Entry,
      name: nameToUse,
      system: {
        type: options.type || '',
      }
    }],{
      parent: currentJournals.value[topic],
      // pack: currentWorldCompendium.value.metadata.id,
    });

    await currentWorldCompendium.value.configure({locked:true});

    if (entry) {
      // set parent if specified
      if (options.parentId==undefined) {
        // no parent - set as a top node
        const topNodes = WorldFlags.getTopicFlag(worldFolder.uuid, WorldFlagKey.topNodes, topic);
        await WorldFlags.setTopicFlag(worldFolder.uuid, WorldFlagKey.topNodes, topic, topNodes.concat([entry[0].uuid]));

        // set the blank hierarchy
        if (hasHierarchy(topic)) {
          await WorldFlags.setHierarchy(worldFolder.uuid, entry[0].uuid, {
            parentId: '',
            ancestors: [],
            children: [],
            type: '',
          } as Hierarchy);
        }
      } else {
        // add to the tree
        if (hasHierarchy(topic)) {
          await directoryStore.setNodeParent(topic, entry[0].uuid, options.parentId);
        }
      }

      await directoryStore.updateFilterNodes();  // otherwise the new item will be hidden
      await directoryStore.refreshCurrentTree(options.parentId ? [options.parentId, entry[0].uuid] : [entry[0].uuid]);
    }
   
    return entry ? entry[0] : null;
  };

  // delete an entry from the world
  const deleteEntry = async (topic: ValidTopic, entryId: string) => {
    const entry = await fromUuid(entryId) as JournalEntryPage;

    if (!entry || !currentWorldId.value)
      return;

    const hierarchy = WorldFlags.getHierarchy(currentWorldId.value, entry.uuid);

    // have to unlock the pack
    await currentWorldCompendium.value.configure({locked:false});

    // delete from any trees
    if (hierarchy?.ancestors || hierarchy?.children) {
      await cleanTrees(currentWorldFolderId.value, topic, entry.uuid, hierarchy);
    }

    await entry.delete();

    await currentWorldCompendium.value.configure({locked:true});

    // TODO - remove from any relationships
    // TODO - remove from search

    // update tabs
    await navigationStore.cleanupDeletedEntry(entry.uuid);

    // refresh and force its parent to update
    await directoryStore.refreshCurrentTree(hierarchy.parentId ? [hierarchy.parentId] : []);
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