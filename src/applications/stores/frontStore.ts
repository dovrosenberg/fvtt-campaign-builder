// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, computed } from 'vue';

// local imports
import { useCampaignDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';

// types
import { Danger, DangerParticipant, GrimPortent} from '@/types';
import { localize } from '@/utils/game';
import { notifyWarn } from '@/utils/notifications';
import { reactive } from 'vue';

// the store definition
export const useFrontStore = defineStore('front', () => {
  ///////////////////////////////
  // the state

  // used for tables
  const participantRows = ref<DangerParticipant[]>([]);
  const grimPortentRows = ref<GrimPortent[]>([]);


  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const frontStore = useFrontStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentFront, currentContentTab } = storeToRefs(mainStore);
  
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
  const addParticipant = async (role: string = ''): Promise<string | null> => {
    if (!currentDanger.value || currentDangerIndex.value == null)
      return null;

    const uuid = foundry.utils.randomID();
    currentFront.value?.updateDanger(currentDangerIndex.value, {
      ...currentDanger.value,
      participants: [...currentDanger.value.participants, { uuid, role }],
    });
    await currentFront.value?.save();

    _refreshParticipantRows();

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

    _refreshPortentRows();

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
  
  // const reorderIdeas = async (reorderedIdeas: Idea[]) => {
  //   if (!currentCampaign.value) return;

  //   currentCampaign.value.ideas = reorderedIdeas;
  //   await currentCampaign.value.save();
  //   await _refreshIdeaRows();
  // };

  // const reorderToDos = async (reorderedToDos: ToDoItem[]) => {
  //   if (!currentCampaign.value) return;

  //   currentCampaign.value.todoItems = reorderedToDos;
  //   await currentCampaign.value.save();
  //   await _refreshToDoRows();
  // };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  // force reactive update of current table rows
  const _refreshParticipantRows = (): void => {
    participantRows.value = [];

    if (!currentDanger.value)
      return;
    
    participantRows.value = [...currentDanger.value.participants];
  }

  const _refreshPortentRows = (): void => {
    grimPortentRows.value = [];

    if (!currentDanger.value)
      return;
    
    grimPortentRows.value = [...currentDanger.value.grimPortents];
  }

  const _refreshDangerRows = (): void => {
    _refreshParticipantRows();
    _refreshPortentRows();
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
  };
});

