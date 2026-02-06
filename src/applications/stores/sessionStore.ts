// this store handles activities specific to campaigns 
// 
// library imports
import { ref, watch, } from 'vue';
import { storeToRefs, } from 'pinia';

// local imports
import { useCampaignDirectoryStore, useMainStore, useNavigationStore, usePlayingStore, } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game'; 
import ArcIndexService from '@/utils/arcIndex';

// types
import { 
  SessionLocationDetails, 
  SessionItemDetails, 
  BaseTableColumn, 
  Topics, 
  SessionNPCDetails, 
  SessionMonsterDetails, 
  SessionLoreDetails,
  ToDoTypes,
  SessionTableTypes
} from '@/types';
import { SessionLore, SessionVignette } from '@/documents';

import { Arc, Entry, Session } from '@/classes';


// the store definition
export const sessionStore = () => {
  ///////////////////////////////
  // the state
  // used for tables
  const relatedLocationRows = ref<SessionLocationDetails[]>([]);
  const relatedEntryRows = ref<SessionItemDetails[]>([]);
  const relatedNPCRows = ref<SessionNPCDetails[]>([]);
  const relatedMonsterRows = ref<SessionMonsterDetails[]>([]);
  const vignetteRows = ref<SessionVignette[]>([]);
  const loreRows = ref<SessionLoreDetails[]>([]); 
  
  const extraFields = {
    [SessionTableTypes.None]: [],
    [SessionTableTypes.Location]: [
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick },
      { field: 'type', style: 'text-align: left', header: 'Type', sortable: true },
      { field: 'parent', style: 'text-align: left', header: 'Parent', sortable: true, onClick: onParentClick},
      { field: 'notes', style: 'text-align: left', header: 'Notes', editable: true },
    ],
    [SessionTableTypes.Item]: [
      { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' },
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onItemClick },
      { field: 'notes', style: 'text-align: left', header: 'Notes', editable: true },
    ],  
    [SessionTableTypes.NPC]: [
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick },
      { field: 'type', style: 'text-align: left', header: 'Type', sortable: true },
      { field: 'notes', style: 'text-align: left', header: 'Notes', editable: true },
    ],
    [SessionTableTypes.Monster]: [
      { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' },
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onMonsterClick },
      { field: 'number', header: 'Number', style: 'width: 80px; max-width: 80px', editable: true, smallEditBox: true },
      { field: 'notes', style: 'text-align: left', header: 'Notes', editable: true },
    ], 
    [SessionTableTypes.Vignette]: [
      { field: 'description', style: 'text-align: left', header: 'Vignette', editable: true },
    ],
    [SessionTableTypes.Lore]: [
      { field: 'significant', header: 'Sig.', editable: true, type: 'boolean', tooltip: 'Mark as Significant/Insignificant', style: 'text-align: center; width: 40px; max-width: 40px' },
      { field: 'description', style: 'text-align: left; width: 100%', header: 'Description', editable: true },
    ],  
  } as unknown as Record<SessionTableTypes, BaseTableColumn[]>;

  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const playingStore = usePlayingStore();
  const { currentSetting, currentContentTab, currentSession, } = storeToRefs(mainStore);
  const { currentPlayedSessionId } = storeToRefs(playingStore);

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
  const addLocation = async (uuid: string, delivered: boolean = false): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addLocation()');

    await currentSession.value.addLocation(uuid, delivered);
    await _refreshLocationRows();
  }

  /**
   * Adds a location to the played session.
   * @param uuid the UUID of the location to add.
   */
  const addLocationToPlayedSession = async (uuid: string, delivered: boolean = false): Promise<void> => {
    if (!currentPlayedSessionId.value)
      throw new Error('Invalid session Id in sessionStore.addLocationToPlayedSession()');

    const session = await Session.fromUuid(currentPlayedSessionId.value);
    if (!session)
      throw new Error('Invalid session in sessionStore.addLocationToPlayedSession()');

    await session.addLocation(uuid, delivered);
    await _refreshLocationRows();

    // refresh the viewed session if needed
    if (currentSession.value?.uuid === session.uuid)
      await mainStore.refreshSession(true);
  }

  /**
   * Deletes a location from the session.
   * @param uuid - The UUID of the location to delete.
   * @param skipConfirm - If true, skip the confirmation dialog.
   * @returns True if the location was deleted, false if the user canceled.
   */
  const deleteLocation = async (uuid: string, skipConfirm = false): Promise<boolean> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteLocation()');

    // confirm
    if (!skipConfirm && !(await FCBDialog.confirmDialog('Delete location?', 'Are you sure you want to delete this location? This will not impact the associated Setting Location')))
      return false;

    await currentSession.value.deleteLocation(uuid);
    await _refreshLocationRows();
    return true;
  }

  /**
   * Updates the notes associated with a location
   * @param uuid the UUID of the location
   * @param notes the new notes
   */
  const updateLocationNotes = async (uuid: string, notes: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.updateLocationNotes()');

    await currentSession.value.updateLocationNotes(uuid, notes);
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

    const entry = await Entry.fromUuid(uuid);

    let campaign;
    if (entry)
      campaign = await currentSession.value.loadCampaign();

    if (entry && delivered && campaign) {
      await campaign.mergeToDoItem(ToDoTypes.Entry, `Delivered in session ${currentSession.value.number}`, uuid);
    }

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
   * Reorders locations in the session (persisting the new array order).
   * @param reorderedLocations the reordered location array
   */
  const reorderLocations = async (reorderedLocations: SessionLocation[]): Promise<void> => {
    if (!currentSession.value)
      return;

    currentSession.value.locations = reorderedLocations;
    await currentSession.value.save();
    await _refreshLocationRows();
  };

  /**
   * Adds a NPC to the session.
   * @param uuid the UUID of the character to add.
   */
  const addNPC = async (uuid: string, delivered: boolean = false): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addNPC()');

    await currentSession.value.addNPC(uuid, delivered);
    await _refreshNPCRows();
  }

  /**
   * Adds a NPC to the played session.
   * @param uuid the UUID of the character to add.
   */
  const addNPCToPlayedSession = async (uuid: string, delivered: boolean = false): Promise<void> => {
    if (!currentPlayedSessionId.value)
      throw new Error('Invalid session Id in sessionStore.addNPCToPlayedSession()');

    const session = await Session.fromUuid(currentPlayedSessionId.value);
    if (!session)
      throw new Error('Invalid session in sessionStore.addNPCToPlayedSession()');

    await session.addNPC(uuid, delivered);
    await _refreshNPCRows();
  }

  /**
   * Deletes an NPC from the session.
   * @param uuid - The UUID of the character to delete.
   * @param skipConfirm - If true, skip the confirmation dialog.
   * @returns True if the NPC was deleted, false if the user canceled.
   */
  const deleteNPC = async (uuid: string, skipConfirm = false): Promise<boolean> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteNPC()');

    // confirm
    if (!skipConfirm && !(await FCBDialog.confirmDialog('Delete NPC?', 'Are you sure you want to delete this NPC? This will not impact the associated Character')))
      return false;
    
    await currentSession.value.deleteNPC(uuid);
    await _refreshNPCRows();
    return true;
  }

  /**
   * Updates the notes associated with an NPC
   * @param uuid the UUID of the NPC
   * @param notes the new notes
   */
  const updateNPCNotes = async (uuid: string, notes: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.updateNPCNotes()');

    await currentSession.value.updateNPCNotes(uuid, notes);
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

    const entry = await Entry.fromUuid(uuid);

    let campaign;
    if (entry)
      campaign = await currentSession.value.loadCampaign();

    if (entry && delivered && campaign) {
      await campaign.mergeToDoItem(ToDoTypes.Entry, `Delivered in session ${currentSession.value.number}`, uuid);
    }

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
   * Reorders NPCs in the session (persisting the new array order).
   * @param reorderedNPCs the reordered NPC array
   */
  const reorderNPCs = async (reorderedNPCs: SessionNPC[]): Promise<void> => {
    if (!currentSession.value)
      return;

    currentSession.value.npcs = reorderedNPCs;
    await currentSession.value.save();
    await _refreshNPCRows();
  };

  /**
   * Adds a vignette to the session.
   * @param description The description for the entry
   * @returns The UUID of the created entry
   */
  const addVignette = async (description = ''): Promise<string | null> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addVignette()');

    const vignetteUuid = await currentSession.value.addVignette(description);
    await _refreshVignetteRows();
    return vignetteUuid;
  }

  /**
   * Updates the description associated with a vignette row
   * @param uuid the UUID of the vignette
   */
  const updateVignetteDescription = async (uuid: string, description: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.updateVignetteDescription()');

    await currentSession.value.updateVignetteDescription(uuid, description);
    await _refreshVignetteRows();
  }
  
  /**
   * Deletes a vignette from the session.
   * @param uuid - The UUID of the vignette to delete.
   * @param skipConfirm - If true, skip the confirmation dialog.
   * @returns True if the vignette was deleted, false if the user canceled.
   */
  const deleteVignette = async (uuid: string, skipConfirm = false): Promise<boolean> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteVignette()');

    // confirm
    if (!skipConfirm && !(await FCBDialog.confirmDialog('Delete vignette?', 'Are you sure you want to delete this vignette?')))
      return false;
    
    await currentSession.value.deleteVignette(uuid);
    await _refreshVignetteRows();
    return true;
  }

  /**
   * Set the delivered status for a given vignette.
   * @param uuid the UUID of the vignette
   * @param delivered the new delivered status
   */
  const markVignetteDelivered = async (uuid: string, delivered: boolean): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.markVignetteDelivered()');

    await currentSession.value.markVignetteDelivered(uuid, delivered);

    const vignette = currentSession.value.vignettes.find(v=> v.uuid===uuid);

    let campaign;
    if (vignette)
      campaign = await currentSession.value.loadCampaign();

    if (vignette && delivered && campaign) {
      await campaign.mergeToDoItem(ToDoTypes.Vignette, `Delivered in session ${currentSession.value.number}`, null, currentSession.value.uuid);
    }
    await _refreshVignetteRows();
  }

  /**
   * Move a vignette to the next session in the campaign, creating it if needed.
   * @param uuid the UUID of the vignette to move
   */
  const moveVignetteToNext = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      return;

    const nextSession = await getNextSession();

    if (!nextSession)
      return;

    const currentVignette = currentSession.value.vignettes.find(s=> s.uuid===uuid);

    if (!currentVignette)
      return;

    // have a next session - add there and delete here
    await nextSession.addVignette(currentVignette.description);
    await currentSession.value.deleteVignette(uuid);

    await _refreshVignetteRows();
  }

  /**
   * Adds a lore to the session.
   * @param description The description for the lore entry
   * @returns The UUID of the created lore entry
   */
  const addLore = async (description = ''): Promise<string | null> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.addLore()');

    const loreUuid = await currentSession.value.addLore(description);
    await _refreshLoreRows();
    return loreUuid;
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
   * Deletes a lore entry from the session.
   * @param uuid - The UUID of the lore entry to delete.
   * @param skipConfirm - If true, skip the confirmation dialog.
   * @returns True if the lore was deleted, false if the user canceled.
   */
  const deleteLore = async (uuid: string, skipConfirm = false): Promise<boolean> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteLore()');

    // confirm
    if (!skipConfirm && !(await FCBDialog.confirmDialog('Delete lore?', 'Are you sure you want to delete this lore?')))
      return false;
    
    await currentSession.value.deleteLore(uuid);
    await _refreshLoreRows();
    return true;
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

    const lore = currentSession.value.lore.find(l=> l.uuid===uuid);

    // add to do do list if needed
    if (lore && delivered) {
      let campaign = await currentSession.value.loadCampaign();

      if (campaign) {
        await campaign.mergeToDoItem(ToDoTypes.Lore, `Delivered in session ${currentSession.value.number}`, null, currentSession.value.uuid);
      }
    }

    await _refreshLoreRows();
  };

  /**
   * Set the significant status for a given lore.
   * @param uuid the UUID of the lore
   * @param significant the new significant status
   */
  const markLoreSignificant = async (uuid: string, significant: boolean): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.markLoreSignificant()');

    await currentSession.value.markLoreSignificant(uuid, significant);
    await _refreshLoreRows();
  };

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
   * Move a lore back to the campaign as unused.
   * @param uuid the UUID of the lore to move
   */
  const moveLoreToCampaign = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      return;

    const currentLore = currentSession.value.lore.find(l=> l.uuid===uuid);

    if (!currentLore)
      return;

    const campaign = await currentSession.value.loadCampaign();

    if (!campaign) 
      return;
    
    // have a next session - add there and delete here
    await campaign.addLore(currentLore.description);
    await currentSession.value.deleteLore(uuid);

    await _refreshLoreRows();
  }

  /**
   * Move a lore back to the arc as unused.
   * @param uuid the UUID of the lore to move
   */
  const moveLoreToArc = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      return;

    const currentLore = currentSession.value.lore.find(l=> l.uuid===uuid);

    if (!currentLore)
      return;


    const campaign = await currentSession.value.loadCampaign();

    if (!campaign) 
      return;

    const arcIndexEntry = ArcIndexService.getArcForSession(campaign.arcIndex, currentSession.value.number);
    const arc = arcIndexEntry ? await Arc.fromUuid(arcIndexEntry.uuid) : null;
    if (!arc)
      return;
    
    // have a next session - add there and delete here
    await arc.addLore(currentLore.description);
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
   * Deletes a magic item from the session.
   * @param uuid - The UUID of the item to delete.
   * @param skipConfirm - If true, skip the confirmation dialog.
   * @returns True if the item was deleted, false if the user canceled.
   */
  const deleteItem = async (uuid: string, skipConfirm = false): Promise<boolean> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteItem()');

    // confirm
    if (!skipConfirm && !(await FCBDialog.confirmDialog('Delete item?', 'Are you sure you want to delete this item?')))
      return false;
    
    await currentSession.value.deleteItem(uuid);
    await _refreshItemRows();
    return true;
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

    const entry = await fromUuid<Item>(uuid);

    let campaign;
    if (entry)
      campaign = await currentSession.value.loadCampaign();

    if (entry && delivered && campaign) {
      await campaign.mergeToDoItem(ToDoTypes.Item, `Delivered in session ${currentSession.value.number}`, null, currentSession.value.uuid);
    }

    await _refreshItemRows();
  }

  /**
   * Updates the notes associated with a magic item
   * @param uuid the UUID of the item
   * @param notes the new notes
   */
  const updateItemNotes = async (uuid: string, notes: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.updateItemNotes()');

    await currentSession.value.updateItemNotes(uuid, notes);
    await _refreshItemRows();
  }

  /**
   * Updates the notes associated with a monster
   * @param uuid the UUID of the monster
   * @param notes the new notes
   */
  const updateMonsterNotes = async (uuid: string, notes: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.updateMonsterNotes()');

    await currentSession.value.updateMonsterNotes(uuid, notes);
    await _refreshMonsterRows();
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
   * Deletes a monster from the session.
   * @param uuid - The UUID of the actor to delete.
   * @param skipConfirm - If true, skip the confirmation dialog.
   * @returns True if the monster was deleted, false if the user canceled.
   */
  const deleteMonster = async (uuid: string, skipConfirm = false): Promise<boolean> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteMonster()');

    // confirm
    if (!skipConfirm && !(await FCBDialog.confirmDialog('Delete monster?', 'Are you sure you want to delete this monster?')))
      return false;
    
    await currentSession.value.deleteMonster(uuid);
    await _refreshMonsterRows();
    return true;
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

    const entry = await fromUuid<Actor>(uuid);

    let campaign;
    if (entry)
      campaign = await currentSession.value.loadCampaign();

    if (entry && delivered && campaign) {
      await campaign.mergeToDoItem(ToDoTypes.Monster, `Delivered in session ${currentSession.value.number}`, null, currentSession.value.uuid);
    }

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

  /**
   * Reorders items in the session (persisting the new array order).
   * @param reorderedItems the reordered item array
   */
  const reorderItems = async (reorderedItems: SessionItem[]): Promise<void> => {
    if (!currentSession.value)
      return;

    currentSession.value.items = reorderedItems;
    await currentSession.value.save();
    await _refreshItemRows();
  };

  /**
   * Reorders monsters in the session (persisting the new array order).
   * @param reorderedMonsters the reordered monster array
   */
  const reorderMonsters = async (reorderedMonsters: SessionMonster[]): Promise<void> => {
    if (!currentSession.value)
      return;

    currentSession.value.monsters = reorderedMonsters;
    await currentSession.value.save();
    await _refreshMonsterRows();
  };

  /**
   * Reorders story webs on the session (persisting the new array order).
   * @param reorderedStoryWebIds the reordered story web id array
   */
  const reorderStoryWebs = async (reorderedStoryWebIds: string[]): Promise<void> => {
    if (!currentSession.value)
      return;

    currentSession.value.storyWebs = reorderedStoryWebIds;
    await currentSession.value.save();
    await mainStore.refreshCurrentContent();
  };

  const getNextSession = async (): Promise<Session | null> => {
    let campaign;
    if (currentSession.value)
      campaign = await currentSession.value.loadCampaign();

    if (!currentSession.value || !campaign || currentSession.value.number===null)
      return null;

    const nextSessionNumber = currentSession.value.number+1;
    const nextSessionIndex = campaign.sessionIndex
      .find(s=> s.number === nextSessionNumber);

    if (nextSessionIndex) {
      const nextSession = await Session.fromUuid(nextSessionIndex.uuid);
    
      // found it - just return it
      if (nextSession) 
        return nextSession;
    }
    
    // need to create one
    const newSession = await Session.create(campaign);
    if (!newSession)
      return null;

    newSession.number = nextSessionNumber;

    await campaignDirectoryStore.refreshCampaignDirectoryTree();

    return newSession;
  }

  const reorderVignettes = async (reorderedVignettes: SessionVignette[]) => {
    if (!currentSession.value) return;

    currentSession.value.vignettes = reorderedVignettes;
    await currentSession.value.save();
    await _refreshVignetteRows();
  };

  const reorderLore = async (reorderedLore: SessionLore[]) => {
    if (!currentSession.value) return;

    currentSession.value.lore = reorderedLore;
    await currentSession.value.save();
    await _refreshLoreRows();
  };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

  // when we click on an item, open it
  async function onItemClick (_event: MouseEvent, uuid: string) {
    const item = await fromUuid<Item>(uuid);

    if (item)
      item.sheet?.render(true);
  }

  // when we click on an monster, open it
  async function onMonsterClick (_event: MouseEvent, uuid: string) {
    const monster = await fromUuid<Actor>(uuid);

    if (monster)
      monster.sheet?.render(true);
  }

  // when we click on a name, open the entry
  async function onNameClick (event: MouseEvent, uuid: string) {
    navigationStore.openEntry(uuid, { newTab: event.ctrlKey, activate: true });
  }

  // when we click on a parent, open the entry
  async function onParentClick (event: MouseEvent, uuid: string) {
    // get entry Id
    const parentId = relatedLocationRows.value.find(r=> r.uuid===uuid)?.parentId;

    if (parentId)
      navigationStore.openEntry(parentId, { newTab: event.ctrlKey, activate: true });
  }


  const _refreshLocationRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionLocationDetails[];
    const topicFolder = currentSetting.value?.topicFolders[Topics.Location];

    if (!topicFolder)
      throw new Error('Invalid topic folder in sessionStore._refreshRows()');

    for (const location of currentSession.value?.locations) {
      const entry = await topicFolder.findEntry(location.uuid);

      if (!entry)
        continue;

      const parentId = await entry.getParentId();
      const parent = parentId ? await Entry.fromUuid(parentId) : null;

      if (entry) {
        retval.push({
          uuid: location.uuid,
          delivered: location.delivered,
          name: entry.name, 
          type: entry.type,
          parent: parent?.name || '',
          parentId: parent?.uuid || null,
          notes: location.notes || '',
        });
      }
    }

    relatedLocationRows.value = retval;
  }


  const _refreshNPCRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionNPCDetails[];
    const topicFolder = currentSetting.value?.topicFolders[Topics.Character];

    if (!topicFolder)
      throw new Error('Invalid topic folder in sessionStore._refreshRows()');

    for (const npc of currentSession.value?.npcs) {
      const entry = await topicFolder.findEntry(npc.uuid);

      if (entry) {
        retval.push({
          uuid: npc.uuid,
          delivered: npc.delivered,
          name: entry.name, 
          type: entry.type,
          notes: npc.notes || '',
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
      const entry = await fromUuid<Item>(item.uuid);

      if (entry) {
        retval.push({
          uuid: item.uuid,
          delivered: item.delivered,
          name: entry.name, 
          notes: item.notes || '',
          dragTooltip: localize('tooltips.dragItemFromSession'),
        });
      } else {
        // the item was deleted - remove it from our session
        await currentSession.value.deleteItem(item.uuid);
      }
    }

    relatedEntryRows.value = retval;
  }

  const _refreshMonsterRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionMonsterDetails[];

    for (const monster of currentSession.value?.monsters) {
      const entry = await fromUuid<Actor>(monster.uuid);

      if (entry) {
        retval.push({
          uuid: monster.uuid,
          delivered: monster.delivered,
          number: monster.number,
          notes: monster.notes || '',
          name: entry.name, 
          dragTooltip: localize('tooltips.dragMonsterFromSession'),
        });
      } else {
        // the actor was deleted - remove it from our session
        await currentSession.value.deleteMonster(monster.uuid);
      }
    }

    relatedMonsterRows.value = retval;
  }


  const _refreshVignetteRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionVignette[];

    for (const vignette of (currentSession.value?.vignettes || [])) {
      retval.push({
        uuid: vignette.uuid,
        delivered: vignette.delivered,
        description: vignette.description,
      });
    }

    vignetteRows.value = retval;
  }

  const _refreshLoreRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionLoreDetails[];

    for (const lore of currentSession.value?.lore) {
      let entry: JournalEntryPage | null = null;

      if (lore.journalEntryPageId)
        entry = await fromUuid<JournalEntryPage>(lore.journalEntryPageId);

      retval.push({
        uuid: lore.uuid,
        delivered: lore.delivered,
        significant: lore.significant,
        description: lore.description,
      });
    }

    loreRows.value = retval;
  }

  const _refreshRowsForTab = async () => {
    switch (currentContentTab.value) {
      case 'notes':
        // await _refreshLocationRows();
        break;
      case 'lore':
        await _refreshLoreRows();
        break;
      case 'vignettes':
        await _refreshVignetteRows();
        break;
      case 'locations':
        await _refreshLocationRows();
        break;
      case 'npcs':
        await _refreshNPCRows();
        break;
      case 'monsters':
        await _refreshMonsterRows();
        break;
      case 'magic':
        await _refreshItemRows();
        break;
      case 'pcs':
        // handled by campaignStore
        break;
      default:
        break;
    }
  }


  ///////////////////////////////
  // watchers
  watch(()=> currentSession.value, async () => {
    // just refresh the rows for the current contentTab
    await _refreshRowsForTab();
  });

  watch(()=> currentContentTab.value, async () => {
    await _refreshRowsForTab();
  });

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    relatedLocationRows,
    relatedEntryRows,
    relatedNPCRows,
    relatedMonsterRows,
    vignetteRows,
    loreRows,
    extraFields,
    addLocation,
    addLocationToPlayedSession,
    deleteLocation,
    updateLocationNotes,
    markLocationDelivered,
    moveLocationToNext,
    reorderLocations,
    addItem,
    deleteItem,
    updateItemNotes,
    markItemDelivered,
    moveItemToNext,
    reorderItems,
    addNPC,
    addNPCToPlayedSession,
    deleteNPC,
    updateNPCNotes,
    markNPCDelivered,
    moveNPCToNext,
    reorderNPCs,
    addMonster,
    deleteMonster,
    updateMonsterNumber,
    updateMonsterNotes,
    markMonsterDelivered,
    moveMonsterToNext,
    reorderMonsters,
    reorderStoryWebs,
    addVignette,
    deleteVignette,
    updateVignetteDescription,
    markVignetteDelivered,
    moveVignetteToNext,
    reorderVignettes,
    addLore,
    deleteLore,
    reorderLore,
    updateLoreDescription,
    markLoreDelivered,
    markLoreSignificant,
    moveLoreToNext,
    moveLoreToCampaign,
    moveLoreToArc,
  };
};