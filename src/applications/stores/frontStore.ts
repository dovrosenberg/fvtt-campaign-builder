// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, computed, } from 'vue';

// local imports
import { useMainStore, } from '@/applications/stores';

// types
import { DangerParticipant, GrimPortent} from '@/types';
import { Entry } from '@/classes';

// the store definition
export const useFrontStore = defineStore('front', () => {
  ///////////////////////////////
  // the state

  // used for tables
  const participantRows = ref<(DangerParticipant & { name: string; type: string })[]>([]);
  const grimPortentRows = ref<GrimPortent[]>([]);


  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentFront, currentContentTab, currentSetting } = storeToRefs(mainStore);
  
  // internal state

  ///////////////////////////////
  // external state
  const currentDangerIndex = computed(() => {
    if (!currentFront.value || currentContentTab.value == null)
      return null;

    const index = parseInt(currentContentTab.value);
    if (isNaN(index) || index < 0 || index >= currentFront.value.dangers.length)
      return null;

    return index;
  });

  const currentDanger = computed(() => {
    if (!currentFront.value || currentDangerIndex.value == null)
      return null;

    return currentFront.value.dangers[currentDangerIndex.value];
  });

  ///////////////////////////////
  // actions
  /** add participant to given danger */
  const addParticipant = async (entryToAdd: Entry, extraFields: Record<string, string>): Promise<string | null> => {
    if (!currentDanger.value || currentDangerIndex.value == null)
      return null;

    const uuid = entryToAdd.uuid;
    currentFront.value?.updateDanger(currentDangerIndex.value, {
      ...currentDanger.value,
      participants: [...currentDanger.value.participants, { uuid, role: extraFields.role || '' }],
    });
    await currentFront.value?.save();

    await _refreshParticipantRows();

    return uuid;
  };

  /** remove participant from given danger */
  const deleteParticipant = async (uuid: string): Promise<void> => {
    if (!currentDanger.value || currentDangerIndex.value == null)
      return;
    
    currentFront.value?.updateDanger(currentDangerIndex.value, {
      ...currentDanger.value,
      participants: currentDanger.value.participants.filter(p => p.uuid !== uuid),
    });
    await currentFront.value?.save();

    await _refreshParticipantRows();
  };

  /** update participant in given danger */
  const updateParticipant = async (uuid: string, role: string): Promise<void> => {
    if (!currentDanger.value || currentDangerIndex.value == null)
      return;

    currentFront.value?.updateDanger(currentDangerIndex.value, {
      ...currentDanger.value,
      participants: currentDanger.value.participants.map(p => p.uuid === uuid ? { uuid, role } : p),
    });
    await currentFront.value?.save();

    await _refreshParticipantRows();
  };
  
  /** add portent to given danger 
   * @returns the uuid of the new portent
   */
  const addGrimPortent = async (description = ''): Promise<string | null> => {
    if (!currentDanger.value || currentDangerIndex.value == null)
      return null;
    
    const uuid = foundry.utils.randomID();
    currentFront.value?.updateDanger(currentDangerIndex.value, {
      ...currentDanger.value,
      grimPortents: [...currentDanger.value.grimPortents, { uuid, description }],
    });
    await currentFront.value?.save();

    await _refreshPortentRows();

    return uuid;
  };

    /** remove portent from given danger */
  const deleteGrimPortent = async (uuid: string): Promise<void> => {
    if (!currentDanger.value || currentDangerIndex.value == null)
      return;
    
    currentFront.value?.updateDanger(currentDangerIndex.value, {
      ...currentDanger.value,
      grimPortents: currentDanger.value.grimPortents.filter(p => p.uuid !== uuid),
    });
    await currentFront.value?.save();

    await _refreshPortentRows();
  };

  /** update portent in given danger */
  const updateGrimPortent = async (uuid: string, description: string): Promise<void> => {
    if (!currentDanger.value || currentDangerIndex.value == null)
      return;
    
    currentFront.value?.updateDanger(currentDangerIndex.value, {
      ...currentDanger.value,
      grimPortents: currentDanger.value.grimPortents.map(p => p.uuid === uuid ? { uuid, description } : p),
    });
    await currentFront.value?.save();

    await _refreshPortentRows();
  };
  
  const reorderGrimPortents = async (reorderedPortents: GrimPortent[]) => {
    if (!currentFront.value || currentDangerIndex.value == null || !currentDanger.value) 
      return;

    currentFront.value?.updateDanger(currentDangerIndex.value, {
      ...currentDanger.value,
      grimPortents: reorderedPortents,
    });
    await currentFront.value?.save();

    await _refreshPortentRows();
  };

  const reorderParticipants = async (reorderedParticipants: DangerParticipant[]) => {
    if (!currentFront.value || currentDangerIndex.value == null || !currentDanger.value) 
      return;

    currentFront.value?.updateDanger(currentDangerIndex.value, {
      ...currentDanger.value,
      participants: reorderedParticipants,
    });
    await currentFront.value?.save();

    await _refreshParticipantRows();
  };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  // force reactive update of current table rows
  const _refreshParticipantRows = async (): Promise<void> => {
    participantRows.value = [];

    if (!currentDanger.value || !currentSetting.value)
      return;
    
    for (const p of currentDanger.value.participants) {
      // get it from the setting because we don't know topic
      const items = await currentSetting.value.filterEntries((e) => e.uuid===p.uuid, true);
      
      if (items.length === 0)
        throw new Error('Invalid uuid in frontStore._refreshParticipantRows');

      participantRows.value.push({
        uuid: p.uuid,
        name: items[0].name,
        type: items[0].type,
        role: p.role,
      });
    }
  }

  const _refreshPortentRows = (): void => {
    grimPortentRows.value = [];

    if (!currentDanger.value)
      return;
    
    grimPortentRows.value = [...currentDanger.value.grimPortents];
  }

  const _refreshDangerRows = async(): Promise<void> => {
    await _refreshParticipantRows();
    await _refreshPortentRows();
  };


  ///////////////////////////////
  // watchers
  watch(()=> currentFront.value, async () => {
    await _refreshDangerRows();
  });

  watch(()=> currentContentTab.value, async () => {
    await _refreshDangerRows();
  });

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    currentDanger,
    currentDangerIndex,
    participantRows,
    grimPortentRows,
    
    addParticipant,
    deleteParticipant,
    updateParticipant,
    addGrimPortent,
    deleteGrimPortent,
    updateGrimPortent,  
    reorderGrimPortents,
    reorderParticipants,  
  };
});

