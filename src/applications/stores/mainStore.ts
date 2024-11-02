// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, } from 'pinia';
import { computed, ref } from 'vue';

// local imports
import { getGame } from '@/utils/game';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';
import { getCleanEntry } from '@/compendia';
import { EntryFlags } from 'src/settings/EntryFlags';

// types


// the store definition
export const useMainStore = defineStore('main', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // internal state
  const _currentEntry = ref<JournalEntry | null>(null);  // uuid of current entry

  ///////////////////////////////
  // external state
  const rootFolder = ref<Folder | null>(null);
  const currentWorldFolder = ref<Folder | null>(null);  // the current world folder

  const currentWorldId = computed((): string | null => currentWorldFolder.value ? currentWorldFolder.value.uuid : null);
  const currentEntryId = computed((): string | null => _currentEntry?.value?.uuid || null);
  const currentEntry = computed((): JournalEntry | null => _currentEntry?.value || null);

  ///////////////////////////////
  // actions
  // set a new world from a uuid
  const setNewWorld = async function (worldId: string | null): Promise<void> {
    if (!worldId)
      return;

    // load the folder
    const folder = getGame()?.folders?.find((f)=>f.uuid===worldId) || null;
    
    if (!folder)
      throw new Error('Invalid folder id in mainStore.setNewWorld()');
    
    currentWorldFolder.value = folder;

    await UserFlags.set(UserFlagKey.currentWorld, worldId);
  };

  const setNewEntry = async function (entry: string | null | JournalEntry): Promise<void> {
    if (typeof entry === 'string') {
      _currentEntry.value = await getCleanEntry(entry);

      if (!_currentEntry.value)
        throw new Error('Attempted to setNewEntry with invalid uuid');
    } else
      _currentEntry.value = entry;
  };

  ///////////////////////////////
  // computed state
  const currentEntryTopic = computed((): Topic => {
    if (!currentEntry.value)
      return Topic.None;

    return EntryFlags.get(currentEntry.value, EntryFlagKey.topic);
  })

  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    currentWorldId,
    currentWorldFolder,
    currentEntry,
    currentEntryTopic,
    currentEntryId,
    rootFolder,

    setNewWorld,
    setNewEntry,
  };
});