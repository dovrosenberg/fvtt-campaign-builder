// this store handles activities specific to campaigns 
// 
// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore, } from './index';

// types
import { Topics, ValidTopic, RelatedItemDetails, FieldData, } from '@/types';
import { watch } from 'vue';
import { ref } from 'vue';

// the store definition
export const useSessionStore = defineStore('session', () => {
  ///////////////////////////////
  // the state
  // used for tables
  const relatedPCRows = ref<RelatedItemDetails<any, any>[]>([]);
  
  enum SessionTableTypes {
    None,
  }

  const extraFields = {
    [SessionTableTypes.None]: [],
  } as Record<SessionTableTypes, FieldData>;
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentContentTab, currentSession, } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  
  /**
   * Add a scene to the current entry
   * @param sceneId The id of the scene to add
   */
  // async function addScene(sceneId: string): Promise<void> {
  //   // create the relationship on current entry
  //   const entry = currentEntry.value;

  //   if (!entry || !sceneId)
  //     throw new Error('Invalid entry in relationshipStore.addSceme()');

  //   // update the entry
  //   if (!entry.scenes.includes(sceneId)) {
  //     entry.scenes.push(sceneId);
  //     await entry.save();
  //   }

  //   mainStore.refreshEntry();
  // }

  // /**
  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  const _refreshRows = async () => {
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
    relatedPCRows,
    extraFields,
  };
});