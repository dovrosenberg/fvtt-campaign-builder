// this store handles activities specific to campaigns 
// 
// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore, } from './index';

// types
import { 
  PCDetails, 
  FieldData,
  TablePagination,
} from '@/types';
import { reactive, Ref, watch } from 'vue';
import { ref } from 'vue';

// the store definition
export const useCampaignStore = defineStore('campaign', () => {
  ///////////////////////////////
  // the state
  // used for tables
  const relatedPCRows = ref<PCDetails[]>([]);
  
  // we store the pagination info for each type like a preference
  const defaultPagination: TablePagination = {
    sortField: 'name', 
    sortOrder: 1, 
    first: 0,
    page: 0,
    rowsPerPage: 10, 
    filters: {},
  };

  enum CampaignTableTypes {
    None,
    PC,
  }

  const extraFields = {
    [CampaignTableTypes.None]: [],
    [CampaignTableTypes.PC]: [],
  } as Record<CampaignTableTypes, FieldData>;
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentCampaign, currentContentTab } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  
  /**
   * Add an actor as a PC for the campaign
   * @param actorId The id of the actor to add
   */
  async function addPC(actorId: string): Promise<void> {
    if (!currentCampaign.value || !actorId)
      throw new Error('Invalid campaign/Actor in campaignStore.addPC()');

    // update the campaign
    if (!currentCampaign.value.pcs.includes(actorId)) {
      currentCampaign.value.pcs = [...currentCampaign.value.pcs, actorId]; 
      await currentCampaign.value.save();
    }

    mainStore.refreshCampaign();
  }

  async function deletePC(actorId: string): Promise<void> {
    if (!currentCampaign.value || !actorId)
      throw new Error('Invalid campaign/Actor in campaignStore.deletePC()');

    // update the campaign
    const pcs = [...currentCampaign.value.pcs];
    if (pcs.includes(actorId)) {
      pcs.splice(pcs.indexOf(actorId), 1);
      currentCampaign.value.pcs = pcs;
      await currentCampaign.value.save();
    }

    mainStore.refreshCampaign();
  }


  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  const _refreshRows = async () => {
    if (!currentCampaign.value || !currentContentTab.value) {
      relatedPCRows.value = [];
    } else {
      let table: CampaignTableTypes;
      switch (currentContentTab.value) {
        case 'pcs':
          table = CampaignTableTypes.PC;
          break;
        default:
          table = CampaignTableTypes.None;
      }

      if (table !== CampaignTableTypes.None) {
        relatedPCRows.value = !currentCampaign.value.pcs ? [] :
          Object.values(currentCampaign.value.pcs).map((id)=>{
            return { 
              name: id, 
              uuid: id,
              packid: id,
              packName: id,
            }
          }
          )|| [];
      } else {
        relatedPCRows.value = [];
      }
    }
  };

  ///////////////////////////////
  // watchers
  watch(()=> currentCampaign.value, async () => {
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

    addPC,
    deletePC,
  };
});