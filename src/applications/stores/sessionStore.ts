// this store handles activities specific to campaigns 
// 
// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore, } from './index';

// types
import { SessionLocationDetails, FieldData, Topics, } from '@/types';
import { watch } from 'vue';
import { ref } from 'vue';

// the store definition
export const useSessionStore = defineStore('session', () => {
  ///////////////////////////////
  // the state
  // used for tables
  const relatedLocationRows = ref<SessionLocationDetails[]>([]);
  
  enum SessionTableTypes {
    None,
    Location,
  }

  const extraFields = {
    [SessionTableTypes.None]: [],
    [SessionTableTypes.Location]: [],
  } as Record<SessionTableTypes, FieldData>;
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentWorld, currentContentTab, currentSession, } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  const addLocation = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addLocation()');

    await currentSession.value.addLocation(uuid);
    await _refreshRows();
  }

  const deleteLocation = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteLocation()');

    await currentSession.value.deleteLocation(uuid);
    await _refreshRows();
  }

  const markLocationDelivered = async (uuid: string, delivered: boolean): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.markLocationDelivered()');

    await currentSession.value.markLocationDelivered(uuid, delivered);
    await _refreshRows();
  }

  const moveLocationToNext = async (uuid: string): Promise<void> => {
    throw new Error("sessionstore.moveLocationtonext not writtenl")
    await _refreshRows();
  }

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  const _refreshRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionLocationDetails[];
    const topicFolder = currentWorld.value?.topicFolders[Topics.Location];

    if (!topicFolder)
      throw new Error('Invalid topic folder in sessionStore._refreshRows()');

    for (const location of currentSession.value?.locations) {
      const entry = await topicFolder.findEntry(location.uuid);

      if (entry) {
        retval.push({
          uuid: location.uuid,
          delivered: location.delivered,
          name: entry.name, 
        });
      }
    }

    relatedLocationRows.value = retval;
  };

  ///////////////////////////////
  // watchers
  watch(()=> currentSession.value, async () => {
    await _refreshRows();
  });

  watch(()=> currentContentTab.value, async () => {
    await _refreshRows();
  });

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    relatedLocationRows,
    extraFields,
    addLocation,
    deleteLocation,
    markLocationDelivered,
    moveLocationToNext,
  };
});