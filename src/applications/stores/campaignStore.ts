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
import { watch } from 'vue';
import { ref } from 'vue';
import { localize } from '@/utils/game';

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
        const pcs = await currentCampaign.value.getPCs();
        relatedPCRows.value = !pcs ? [] :
          Object.values(pcs).map((pc: PC)=>{
            const actor = pc.getActor();

            return { 
              name: actor?.name || localize('placeholders.linkToActor'),
              playerName: pc.playerName,
              uuid: pc.uuid,
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
  };
});