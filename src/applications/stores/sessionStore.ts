// this store handles activities specific to campaigns 
// 
// library imports
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore, } from './index';

// types
import { 
  Topics, ValidTopic,
  RelatedItemDetails, FieldData,
  TablePagination,
} from '@/types';
import { reactive, Ref, watch } from 'vue';
import { ref } from 'vue';
import { Campaign, WBWorld } from '@/classes';
import { CampaignDoc } from '@/documents';

// the store definition
export const useSessionStore = defineStore('session', () => {
  ///////////////////////////////
  // the state
  // used for tables
  const relatedPCRows = ref<RelatedItemDetails<any, any>[]>([]);
  
  // we store the pagination info for each type like a preference
  const defaultPagination: TablePagination = {
    sortField: 'name', 
    sortOrder: 1, 
    first: 0,
    page: 0,
    rowsPerPage: 10, 
    filters: {},
  };

  const extraFields = {
    [Topics.Character]: {
      [Topics.Character]: [],
      [Topics.Event]: [],
      [Topics.Location]: [{field:'role', header:'Role'}],
      [Topics.Organization]: [{field:'role', header:'Role'}],
    },
    [Topics.Event]: {
      [Topics.Character]: [],
      [Topics.Event]: [],
      [Topics.Location]: [],
      [Topics.Organization]: [],
    },
    [Topics.Location]: {
      [Topics.Character]: [{field:'role', header:'Role'}],
      [Topics.Event]: [],
      [Topics.Location]: [],
      [Topics.Organization]: [],
    },
    [Topics.Organization]: {
      [Topics.Character]: [{field:'role', header:'Role'}],
      [Topics.Event]: [],
      [Topics.Location]: [],
      [Topics.Organization]: [],
    },    
  } as Record<ValidTopic, Record<ValidTopic, FieldData>>;
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { currentContentTab, currentWorld, currentSession, } = storeToRefs(mainStore);

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

  /**
   * Add an actor as a PC for the campaign
   * @param actorId The id of the actor to add
   */
  async function addPC(actorId: string): Promise<void> {
    if (!currentSession.value || !actorId || !currentWorld.value)
      throw new Error('Invalid session/Actor in sessionStore.addPC()');

    const campaign = new Campaign(await fromUuid(currentSession.value.campaignId) as CampaignDoc, currentWorld.value as WBWorld); 

    // update the campaign
    if (!campaign.pcs.includes(actorId)) {
      campaign.pcs = [...campaign.pcs, actorId]; 
      await campaign.save();
    }

    mainStore.refreshSession();
  }

  /**
   * Remove a PC from the current campaign
   * @param actorId The id of the actor to remove
   */
  async function deletePC(actorId: string): Promise<void> {
    if (!currentSession.value || !actorId ||!currentWorld.value)
      throw new Error('Invalid session/Actor in sessionStore.deletePC()');

    const campaign = new Campaign(await fromUuid(currentSession.value.campaignId) as CampaignDoc, currentWorld.value as WBWorld); 

    // update the campaign
    const pcs = [...campaign.pcs];
    if (pcs.includes(actorId)) {
      pcs.splice(pcs.indexOf(actorId), 1);
      campaign.pcs = pcs;
      await campaign.save();
    }

    mainStore.refreshSession();
  }

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

    addPC,
    deletePC,
  };
});