// this store handles activities specific to campaigns 
// 
// library imports
import { ref, watch } from 'vue';
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useCampaignDirectoryStore, useMainStore, } from '@/applications/stores';

// types
import { SessionLocationDetails, SessionItemDetails, FieldData, Topics, SessionNPCDetails, } from '@/types';
import { Session } from '@/classes';

// the store definition
export const useSessionStore = defineStore('session', () => {
  ///////////////////////////////
  // the state
  // used for tables
  const relatedLocationRows = ref<SessionLocationDetails[]>([]);
  const relatedItemRows = ref<SessionItemDetails[]>([]);
  const relatedNPCRows = ref<SessionNPCDetails[]>([]);
  
  enum SessionTableTypes {
    None,
    Location,
    Item,
    NPC
  }

  const extraFields = {
    [SessionTableTypes.None]: [],
    [SessionTableTypes.Location]: [],
    [SessionTableTypes.Item]: [],  // TODO: do we need extra fields to show the location, etc?
    [SessionTableTypes.NPC]: [],  // TODO: do we need extra fields to show the location, etc?
  } as Record<SessionTableTypes, FieldData>;
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentWorld, currentContentTab, currentSession, } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  
  /**
   * Adds a location to the session.
   * @param uuid the UUID of the location to add.
   */
  const addLocation = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addLocation()');

    await currentSession.value.addLocation(uuid);
    await _refreshRows();
  }

  /**
   * Deletes a location from the session
   * @param uuid the UUID of the location
   */
  const deleteLocation = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteLocation()');

    await currentSession.value.deleteLocation(uuid);
    await _refreshRows();
  }

  /**
   * Set the delivered status for a given location.
   * @param uuid the UUID of the location
   * @param delivered the new delivered status
   */
  const markLocationDelivered = async (uuid: string, delivered: boolean): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.markLocationDelivered()');

    await currentSession.value.markLocationDelivered(uuid, delivered);
    await _refreshRows();
  }

  /**
   * Move a location to the next session in the campaign, creating it if needed.
   * @param uuid the UUID of the location to move
   */
  const moveLocationToNext = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      return;

    const nextSession = await getNextSession();

    if (!nextSession)
      return;

    // have a next session - add there and delete here
    await nextSession.addLocation(uuid);
    await currentSession.value.deleteLocation(uuid);

    await _refreshRows();
  }

  /**
   * Adds a NPC to the session.
   * @param uuid the UUID of the character to add.
   */
  const addNPC = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addNPC()');

    await currentSession.value.addNPC(uuid);
    await _refreshRows();
  }

  /**
   * Deletes a NPC from the session
   * @param uuid the UUID of the character
   */
  const deleteNPC = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteNPC()');

    await currentSession.value.deleteNPC(uuid);
    await _refreshRows();
  }

  /**
   * Set the delivered status for a given NPC.
   * @param uuid the UUID of the character
   * @param delivered the new delivered status
   */
  const markNPCDelivered = async (uuid: string, delivered: boolean): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.markNPCDelivered()');

    await currentSession.value.markNPCDelivered(uuid, delivered);
    await _refreshRows();
  }

  /**
   * Move a NPC to the next session in the campaign, creating it if needed.
   * @param uuid the UUID of the character to move
   */
  const moveNPCToNext = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      return;

    const nextSession = await getNextSession();

    if (!nextSession)
      return;

    // have a next session - add there and delete here
    await nextSession.addNPC(uuid);
    await currentSession.value.deleteNPC(uuid);

    await _refreshRows();
  }

  /**
   * Adds a magic item to the session.
   * @param uuid the UUID of the item to add.
   */
  const addItem = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addItem()');

    await currentSession.value.addItem(uuid);
    await _refreshRows();
  }

  /**
   * Deletes a magic item from the session
   * @param uuid the UUID of the item
   */
  const deleteItem = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteItem()');

    await currentSession.value.deleteItem(uuid);
    await _refreshRows();
  }

  /**
   * Set the delivered status for a given magic item.
   * @param uuid the UUID of the item
   * @param delivered the new delivered status
   */
  const markItemDelivered = async (uuid: string, delivered: boolean): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.markItemDelivered()');

    await currentSession.value.markItemDelivered(uuid, delivered);
    await _refreshRows();
  }

  /**
   * Move a magic item to the next session in the campaign, creating it if needed.
   * @param uuid the UUID of the item to move
   */
  const moveItemToNext = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      return;

    const nextSession = await getNextSession();

    if (!nextSession)
      return;

    // have a next session - add there and delete here
    await nextSession.addItem(uuid);
    await currentSession.value.deleteItem(uuid);

    await _refreshRows();
  }

  const getNextSession = async (): Promise<Session | null> => {
    if (!currentSession.value || !currentSession.value.parentCampaign || currentSession.value.number===null)
      return null;

    const campaign = currentSession.value.parentCampaign;
    const nextSessionNumber = currentSession.value.number+1;
    const nextSession = campaign.filterSessions(s => s.number === nextSessionNumber);

    // found it - just return it
    if (nextSession.length>0) 
      return nextSession[0];
    
    // need to create one
    const newSession = await Session.create(campaign);
    if (!newSession)
      return null;

    newSession.number = nextSessionNumber;

    await campaignDirectoryStore.refreshCampaignDirectoryTree();

    return newSession;
  }

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  const _refreshRows = async () => {
    relatedLocationRows.value = [];
    relatedItemRows.value = [];
    relatedNPCRows.value = [];

    await _refreshLocationRows();
    await _refreshItemRows();
    await _refreshNPCRows();
  };

  const _refreshLocationRows = async () => {
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
  }


  const _refreshNPCRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionNPCDetails[];
    const topicFolder = currentWorld.value?.topicFolders[Topics.Character];

    if (!topicFolder)
      throw new Error('Invalid topic folder in sessionStore._refreshRows()');

    for (const npc of currentSession.value?.npcs) {
      const entry = await topicFolder.findEntry(npc.uuid);

      if (entry) {
        retval.push({
          uuid: npc.uuid,
          delivered: npc.delivered,
          name: entry.name, 
        });
      }
    }

    relatedNPCRows.value = retval;
  }

  const _refreshItemRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionItemDetails[];

    for (const item of currentSession.value?.items) {
      const entry = await fromUuid(item.uuid) as Item;

      if (entry) {
        retval.push({
          uuid: item.uuid,
          delivered: item.delivered,
          name: entry.name, 
        });
      }
    }

    relatedItemRows.value = retval;
  }

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
    relatedItemRows,
    relatedNPCRows,
    extraFields,
    addLocation,
    deleteLocation,
    markLocationDelivered,
    moveLocationToNext,
    addItem,
    deleteItem,
    markItemDelivered,
    moveItemToNext,
    addNPC,
    deleteNPC,
    markNPCDelivered,
    moveNPCToNext,
  };
});