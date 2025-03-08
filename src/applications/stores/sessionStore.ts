// this store handles activities specific to campaigns 
// 
// library imports
import { ref, watch } from 'vue';
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useCampaignDirectoryStore, useMainStore, } from '@/applications/stores';

// types
import { 
  SessionLocationDetails, 
  SessionItemDetails, 
  FieldData, 
  Topics, 
  SessionNPCDetails, 
  SessionMonsterDetails, 
  SessionSceneDetails,
  SessionLoreDetails,
} from '@/types';

import { Session } from '@/classes';

export enum SessionTableTypes {
  None,
  Location,
  Item,
  NPC,
  Monster,
  Scene,
  Lore,
}

// the store definition
export const useSessionStore = defineStore('session', () => {
  ///////////////////////////////
  // the state
  // used for tables
  const relatedLocationRows = ref<SessionLocationDetails[]>([]);
  const relatedItemRows = ref<SessionItemDetails[]>([]);
  const relatedNPCRows = ref<SessionNPCDetails[]>([]);
  const relatedMonsterRows = ref<SessionMonsterDetails[]>([]);
  const relatedSceneRows = ref<SessionSceneDetails[]>([]);
  const relatedLoreRows = ref<SessionLoreDetails[]>([]); 
  

  const extraFields = {
    [SessionTableTypes.None]: [],
    [SessionTableTypes.Location]: [
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true },
    ],
    [SessionTableTypes.Item]: [
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true },
      { field: 'location', style: 'text-align: left', header: 'Location', sortable: true },
    ],  
    [SessionTableTypes.NPC]: [
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true },
    ],
    [SessionTableTypes.Monster]: [
      { field: 'number', header: 'Number', editable: true },
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true },
      { field: 'location', style: 'text-align: left', header: 'Location', sortable: true },
    ], 
    [SessionTableTypes.Scene]: [
      { field: 'description', style: 'text-align: left', header: 'Description', editable: true },
    ],
    [SessionTableTypes.Lore]: [
      { field: 'description', style: 'text-align: left', header: 'Description', editable: true },
      { field: 'journalEntryPageName', style: 'text-align: left', header: 'Journal', editable: false },
      { field: 'location', style: 'text-align: left', header: 'Location', sortable: true },
    ],  
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
    await _refreshLocationRows();
  }

  /**
   * Deletes a location from the session
   * @param uuid the UUID of the location
   */
  const deleteLocation = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteLocation()');

    await currentSession.value.deleteLocation(uuid);
    await _refreshLocationRows();
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
    await _refreshLocationRows();
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

    await _refreshLocationRows();
  }

  /**
   * Adds a NPC to the session.
   * @param uuid the UUID of the character to add.
   */
  const addNPC = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addNPC()');

    await currentSession.value.addNPC(uuid);
    await _refreshNPCRows();
  }

  /**
   * Deletes a NPC from the session
   * @param uuid the UUID of the character
   */
  const deleteNPC = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteNPC()');

    await currentSession.value.deleteNPC(uuid);
    await _refreshNPCRows();
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
    await _refreshNPCRows();
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

    await _refreshNPCRows();
  }

  /**
   * Adds a scene to the session.
   */
  const addScene = async (description = ''): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addScene()');

    await currentSession.value.addScene(description);
    await _refreshSceneRows();
  }

  /**
   * Updates the description associated with a scene row
   * @param uuid the UUID of the scene
   */
  const updateSceneDescription = async (uuid: string, description: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.updateSceneDescription()');

    await currentSession.value.updateSceneDescription(uuid, description);
    await _refreshSceneRows();
  }
  
  /**
   * Deletes a scene from the session
   * @param uuid the UUID of the scene
   */
  const deleteScene = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteScene()');

    await currentSession.value.deleteScene(uuid);
    await _refreshSceneRows();
  }

  /**
   * Set the delivered status for a given scene.
   * @param uuid the UUID of the scene
   * @param delivered the new delivered status
   */
  const markSceneDelivered = async (uuid: string, delivered: boolean): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.markSceneDelivered()');

    await currentSession.value.markSceneDelivered(uuid, delivered);
    await _refreshSceneRows();
  }

  /**
   * Move a scene to the next session in the campaign, creating it if needed.
   * @param uuid the UUID of the scene to move
   */
  const moveSceneToNext = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      return;

    const nextSession = await getNextSession();

    if (!nextSession)
      return;

    const currentScene = currentSession.value.scenes.find(s=> s.uuid===uuid);

    if (!currentScene)
      return;

    // have a next session - add there and delete here
    await nextSession.addScene(currentScene.description);
    await currentSession.value.deleteScene(uuid);

    await _refreshSceneRows();
  }

  /**
   * Adds a lore to the session.
   */
  const addLore = async (description = ''): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addLore()');

    await currentSession.value.addLore(description);
    await _refreshLoreRows();
  }

  /**
   * Updates the description associated with a lore 
   * @param uuid the UUID of the lore
   */
  const updateLoreDescription = async (uuid: string, description: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.updateLoreDescription()');

    await currentSession.value.updateLoreDescription(uuid, description);
    await _refreshLoreRows();
  }
  
  /**
   * Updates the journal entry associated with a lore 
   * @param loreUuid the UUID of the lore
   * @param journalEntryPageUuid the UUID of the journal entry page (or null)
   */
  const updateLoreJournalEntry = async (loreUuid: string, journalEntryPageUuid: string | null): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.updateLoreJournalEntry()');

    await currentSession.value.updateLoreJournalEntry(loreUuid, journalEntryPageUuid);
    await _refreshLoreRows();
  }

  /**
   * Deletes a lore from the session
   * @param uuid the UUID of the l0ore
   */
  const deleteLore = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteLore()');

    await currentSession.value.deleteLore(uuid);
    await _refreshLoreRows();
  }

  /**
   * Set the delivered status for a given lore.
   * @param uuid the UUID of the lore
   * @param delivered the new delivered status
   */
  const markLoreDelivered = async (uuid: string, delivered: boolean): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.markLoreDelivered()');

    await currentSession.value.markLoreDelivered(uuid, delivered);
    await _refreshLoreRows();
  }

  /**
   * Move a lore to the next session in the campaign, creating it if needed.
   * @param uuid the UUID of the lore to move
   */
  const moveLoreToNext = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      return;

    const nextSession = await getNextSession();

    if (!nextSession)
      return;

    const currentLore = currentSession.value.lore.find(l=> l.uuid===uuid);

    if (!currentLore)
      return;

    // have a next session - add there and delete here
    await nextSession.addLore(currentLore.description);
    await currentSession.value.deleteLore(uuid);

    await _refreshLoreRows();
  }

  /**
   * Adds a magic item to the session.
   * @param uuid the UUID of the item to add.
   */
  const addItem = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addItem()');

    await currentSession.value.addItem(uuid);
    await _refreshItemRows();
  }

  /**
   * Deletes a magic item from the session
   * @param uuid the UUID of the item
   */
  const deleteItem = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteItem()');

    await currentSession.value.deleteItem(uuid);
    await _refreshItemRows();
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
    await _refreshItemRows();
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

    await _refreshItemRows();
  }

  /**
   * Adds a monster to the session.
   * @param uuid the UUID of the actor to add.
   */
  const addMonster = async (uuid: string, number = 1): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addMonster()');

    await currentSession.value.addMonster(uuid, number);
    await _refreshMonsterRows();
  }

  /**
   * Deletes a monster from the session
   * @param uuid the UUID of the actor
   */
  const deleteMonster = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteMonster()');

    await currentSession.value.deleteMonster(uuid);
    await _refreshMonsterRows();
  }

  /**
   * Updates the number associated with a a monster row
   * @param uuid the UUID of the actor
   */
  const updateMonsterNumber = async (uuid: string, value: number): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.updateMonsterNumber()');

    await currentSession.value.updateMonsterNumber(uuid, value);
    await _refreshMonsterRows();
  }

  /**
   * Set the delivered status for a given monster.
   * @param uuid the UUID of the actor
   * @param delivered the new delivered status
   */
  const markMonsterDelivered = async (uuid: string, delivered: boolean): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.markMonsterDelivered()');

    await currentSession.value.markMonsterDelivered(uuid, delivered);
    await _refreshMonsterRows();
  }

  /**
   * Move a monster to the next session in the campaign, creating it if needed.
   * @param uuid the UUID of the actor to move
   */
  const moveMonsterToNext = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      return;

    const currentMonster = currentSession.value.monsters.find(m=> m.uuid===uuid);

    if (!currentMonster)
      return;

    const nextSession = await getNextSession();

    if (!nextSession)
      return;

    // have a next session - add there and delete here
    await nextSession.addMonster(uuid, currentMonster.number);
    await currentSession.value.deleteMonster(uuid);

    await _refreshMonsterRows();
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
    relatedMonsterRows.value = [];
    relatedSceneRows.value = [];
    relatedLoreRows.value = [];

    if (!currentSession.value)
      return;

    await _refreshLocationRows();
    await _refreshItemRows();
    await _refreshNPCRows();
    await _refreshMonsterRows();
    await _refreshSceneRows();
    await _refreshLoreRows();
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
          packId: entry.pack,
          location: entry.pack ? `Compendium ${game.packs?.get(entry.pack)?.title}` : 'World',
        });
      }
    }

    relatedItemRows.value = retval;
  }

  const _refreshMonsterRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionMonsterDetails[];

    for (const monster of currentSession.value?.monsters) {
      const entry = await fromUuid(monster.uuid) as Actor;

      if (entry) {
        retval.push({
          uuid: monster.uuid,
          delivered: monster.delivered,
          number: monster.number,
          name: entry.name, 
          packId: entry.pack,
          location: entry.pack ? `Compendium ${game.packs?.get(entry.pack)?.title}` : 'World',
        });
      }
    }

    relatedMonsterRows.value = retval;
  }


  const _refreshSceneRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionSceneDetails[];

    for (const scene of currentSession.value?.scenes) {
      retval.push({
        uuid: scene.uuid,
        delivered: scene.delivered,
        description: scene.description,
      });
    }

    relatedSceneRows.value = retval;
  }

  const _refreshLoreRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionLoreDetails[];

    for (const lore of currentSession.value?.lore) {
      let entry: JournalEntryPage | null = null;

      if (lore.journalEntryPageId)
        entry = await fromUuid(lore.journalEntryPageId) as JournalEntryPage;

      retval.push({
        uuid: lore.uuid,
        delivered: lore.delivered,
        description: lore.description,
        journalEntryPageId: lore.journalEntryPageId,
        journalEntryPageName: entry?.name || null,
        packId: !entry ? null : entry.pack,
        location: !entry ? '' : 
          (entry.pack ? `Compendium ${game.packs?.get(entry.pack)?.title}` : 'World'),
    });
    }

    relatedLoreRows.value = retval;
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
    relatedMonsterRows,
    relatedSceneRows,
    relatedLoreRows,
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
    addMonster,
    deleteMonster,
    updateMonsterNumber,
    markMonsterDelivered,
    moveMonsterToNext,
    addScene,
    deleteScene,
    updateSceneDescription,
    markSceneDelivered,
    moveSceneToNext,
    addLore,
    deleteLore,
    updateLoreDescription,
    updateLoreJournalEntry,
    markLoreDelivered,
    moveLoreToNext,
  };
});