// this store handles the the entry currently being displayed

// library imports
import { defineStore, } from 'pinia';

// local imports
import { getGame } from '@/utils/game';
import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';
import { PackFlagKey, PackFlags } from '@/settings/PackFlags';
import { cleanTrees, hasHierarchy, Hierarchy, } from '@/utils/hierarchy';
import { useDirectoryStore, useNavigationStore } from '@/applications/stores';
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { getTopicText, } from '@/compendia';
import { inputDialog } from '@/dialogs/input';

// types
import { Topic } from '@/types';
import { computed } from 'vue';

// the store definition
export const useCurrentEntryStore = defineStore('CurrentEntry', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const directoryStore = useDirectoryStore();
  const navigationStore = useNavigationStore();
  
  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
   
  ///////////////////////////////
  // actions
  const updateEntryTopic = async (entryId: string, typeName: string): Promise<void> => {
    const entry = await fromUuid(entryId) as JournalEntry;
    const oldType = EntryFlags.get(entry, EntryFlagKey.type) || '';
    await EntryFlags.set(entry, EntryFlagKey.type, typeName);

    await directoryStore.updateEntryTopic(entry, oldType, typeName);
  };

  // creates a new entry in the proper compendium in the given world
  // if name is populated will skip the dialog
  type CreateEntryOptions = { name?: string; type?: string; parentId?: string};
  const createEntry = async (worldFolder: Folder, topic: Topic, options: CreateEntryOptions): Promise<JournalEntry | null> => {
    const topicText = getTopicText(topic);

    let nameTouse = options.name || '' as string | null;
    while (nameTouse==='') {  // if hit ok, must have a value
      nameTouse = await inputDialog(`Create ${topicText}`, `${topicText} Name:`);
    }  
    
    // if name is null, then we cancelled the dialog
    if (!nameTouse)
      return null;

    // create the entry
    const compendia = WorldFlags.get(worldFolder.uuid, WorldFlagKey.compendia);

    if (!compendia || !compendia[topic])
      throw new Error('Missing compendia in currentEntryStore.createEntry()');

    // unlock it to make the change
    const pack = getGame().packs?.get(compendia[topic]);
    if (!pack)
      throw new Error('Bad compendia in currentEntryStore.createEntry()');

    await pack.configure({locked:false});

    const entry = await JournalEntry.create({
      name: nameTouse,
      folder: worldFolder.id,
    },{
      pack: compendia[topic],
    });

    await pack.configure({locked:true});

    if (entry) {
      await EntryFlags.setDefaults(entry, topic, options.type || '');

      // set parent if specified
      if (options.parentId==undefined) {
        // no parent - set as a top node
        const topNodes = PackFlags.get(pack.metadata.id, PackFlagKey.topNodes);
        await PackFlags.set(pack.metadata.id, PackFlagKey.topNodes, topNodes.concat([entry.uuid]));

        // set the blank hierarchy
        if (hasHierarchy(topic)) {
          await PackFlags.setHierarchy(pack.metadata.id, entry.uuid, {
            parentId: '',
            ancestors: [],
            children: [],
            type: '',
          } as Hierarchy);
        }
      } else {
        // add to the tree
        if (hasHierarchy(topic)) {
          await directoryStore.setNodeParent(pack, entry.uuid, options.parentId);
        }
      }

      await directoryStore.updateFilterNodes();  // otherwise the new item will be hidden
      await directoryStore.refreshCurrentTree(options.parentId ? [options.parentId, entry.uuid] : [entry.uuid]);
    }
   
    return entry || null;
  };

  // delete an entry from the world
  const deleteEntry = async (entryId: string) => {
    const entry = await fromUuid(entryId) as JournalEntry;

    if (!entry || !entry.pack)
      return;

    const hierarchy = PackFlags.get(entry.pack, PackFlagKey.hierarchies)[entry.uuid];

    // have to unlock the pack
    const pack = getGame().packs?.get(entry.pack);
    if (pack) {
      await pack.configure({locked:false});

      // delete from any trees
      if (hierarchy?.ancestors || hierarchy?.children) {
        await cleanTrees(pack.metadata.id, entry.uuid, hierarchy);
      }

      await entry.delete();

      await pack.configure({locked:false});

      // TODO - remove from any relationships
      // TODO - remove from search

      // update tabs
      await navigationStore.cleanupDeletedEntry(entry.uuid);

      // refresh and force its parent to update
      await directoryStore.refreshCurrentTree(hierarchy.parentId ? [hierarchy.parentId] : []);
    }
  };


  ///////////////////////////////
  // computed state
  const currentEntryTopic = computed((): Topic => {
    if (!currentEntry.value)
      return Topic.None;
    
    return EntryFlags.get(currentEntry.value, EntryFlagKey.topic) || Topic.None;
  })

  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // watchers
  
  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    updateEntryTopic,
    createEntry,
    deleteEntry,
  };
});