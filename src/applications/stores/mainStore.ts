// this store handles the main state (current world, entry, etc.)

// library imports
import { defineStore, } from 'pinia';
import { computed, ref } from 'vue';

// local imports
import { getGame } from '@/utils/game';
import { UserFlagKey, UserFlags } from '@/settings/UserFlags';

// types


// the store definition
export const useMainStore = defineStore('main', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
  const rootFolder = ref<Folder | null>(null);
  const currentWorldFolder = ref<Folder | null>(null);  // the current world folder
  const currentEntryId = ref<string | null>(null);  // uuid of current entry

  const currentWorldId = computed((): string | null => currentWorldFolder.value ? currentWorldFolder.value.uuid : null);

  ///////////////////////////////
  // actions
  // set a new world from a uuid
  const setNewWorld = async function (worldId: string | null): Promise<void> {
    if (!worldId)
      return;

    // load the folder
    currentWorldFolder.value = getGame()?.folders?.find((f)=>f.uuid===worldId) || null;

    await UserFlags.set(UserFlagKey.currentWorld, worldId);
  };

 
  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    currentWorldId,
    currentWorldFolder,
    currentEntryId,
    rootFolder,

    setNewWorld,
  };
});