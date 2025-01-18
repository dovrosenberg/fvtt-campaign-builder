// this store handles activities specific to campaigns 
// 
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref } from 'vue';

// local imports
import { useMainStore, useNavigationStore } from './index';

// types
import { PCDetails, FieldData, } from '@/types';
import { Campaign, PC } from '@/classes';

// the store definition
export const useCampaignStore = defineStore('campaign', () => {
  ///////////////////////////////
  // the state
  // used for tables
  const relatedPCRows = ref<PCDetails[]>([]);
  
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
  const navigationStore = useNavigationStore();
  const { currentCampaign, currentContentTab, } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  const addPC = async (): Promise<PC | null> => {
    if (!currentCampaign.value)
      return null;

    const campaign = await Campaign.fromUuid(currentCampaign.value.uuid);
    if (!campaign)
      throw new Error('Bad campaign in campaignStore.addPC()');

    const pc = await PC.create(campaign);

    if (pc) {
      await mainStore.refreshCampaign();
      return pc;
    } else { 
      return null;
    }
  };

  const deletePC = async (pcId: string): Promise<void> => {
    const pc = await PC.fromUuid(pcId);

    if (!pc) 
      throw new Error('Bad session in campaignDirectoryStore.deletePC()');

    await pc.delete();

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(pcId);

    await mainStore.refreshCampaign();
  };
  
  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  const _refreshPCRows = async (): Promise<void> => {
    relatedPCRows.value = [];
    if (currentCampaign.value) {
      const pcs = await currentCampaign.value.getPCs();

      if (pcs) {
        for (let i = 0; i < pcs.length; i++) {
          relatedPCRows.value.push({ 
            name: pcs[i].name,
            playerName: pcs[i].playerName,
            uuid: pcs[i].uuid,
          });
        }
      }
    }
  };

  ///////////////////////////////
  // watchers
  watch(()=> currentCampaign.value, async () => {
    await _refreshPCRows();
  });

  watch(()=> currentContentTab.value, async () => {
    await _refreshPCRows();
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