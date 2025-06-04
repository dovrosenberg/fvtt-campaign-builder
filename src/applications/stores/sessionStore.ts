// this store handles activities specific to campaigns 
// 
// library imports
import { ref, watch, } from 'vue';
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useCampaignDirectoryStore, useCampaignStore, useMainStore, useNavigationStore, } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';
import { localize } from '@/utils/game'; 
import { htmlToPlainTextReplaceUuid } from '@/utils/sanitizeHtml';

// types
import { 
  SessionLocationDetails, 
  SessionItemDetails, 
  FieldData, 
  Topics, 
  SessionNPCDetails, 
  SessionMonsterDetails, 
  SessionVignetteDetails,
  SessionLoreDetails,
  ToDoTypes,
} from '@/types';

import { Entry, Session } from '@/classes';

export enum SessionTableTypes {
  None,
  Location,
  Item,
  NPC,
  Monster,
  Vignette,
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
  const relatedVignetteRows = ref<SessionVignetteDetails[]>([]);
  const relatedLoreRows = ref<SessionLoreDetails[]>([]); 
  
  const extraFields = {
    [SessionTableTypes.None]: [],
    [SessionTableTypes.Location]: [
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick },
      { field: 'type', style: 'text-align: left', header: 'Type', sortable: true },
      { field: 'parent', style: 'text-align: left', header: 'Parent', sortable: true, onClick: onParentClick},
      { field: 'description', style: 'text-align: left', header: 'Description', sortable: false},
    ],
    [SessionTableTypes.Item]: [
      { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' },
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onItemClick },
    ],  
    [SessionTableTypes.NPC]: [
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick },
      { field: 'type', style: 'text-align: left', header: 'Type', sortable: true },
      { field: 'description', style: 'text-align: left', header: 'Description', sortable: false},
    ],
    [SessionTableTypes.Monster]: [
      { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' },
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onMonsterClick },
      { field: 'number', header: 'Number', editable: true, smallEditBox: true },
    ], 
    [SessionTableTypes.Vignette]: [
      { field: 'description', style: 'text-align: left', header: 'Vignette', editable: true },
    ],
    [SessionTableTypes.Lore]: [
      { field: 'description', style: 'text-align: left', header: 'Description', editable: true },
      { field: 'journalEntryPageName', style: 'text-align: left; width: 35%;max-width: 35%', header: 'Journal Page', editable: false,
        onClick: onJournalClick
      },
    ],  
  } as Record<SessionTableTypes, FieldData>;

  // track the last value of notes we saved - have to do this 
  const lastSavedNotes = ref<string>();
  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const campaignStore = useCampaignStore();
  const { currentWorld, currentContentTab, currentSession, } = storeToRefs(mainStore);
  const { currentPlayedSession } = storeToRefs(campaignStore);

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
    if (!currentPlayedSession.value)
      throw new Error('Invalid session in sessionStore.addLocationToPlayedSession()');

    await currentPlayedSession.value.addLocation(uuid, delivered);
    await _refreshLocationRows();
  }

  /**
   * Deletes a location from the session
   * @param uuid the UUID of the location
   */
  const deleteLocation = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteLocation()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete location?', 'Are you sure you want to delete this location? This will not impact the associated Setting Location')))
      return;

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
    if (!currentPlayedSession.value)
      throw new Error('Invalid session in sessionStore.addNPCToPlayedSession()');

    await currentPlayedSession.value.addNPC(uuid, delivered);
    await _refreshNPCRows();
  }

  /**
   * Deletes a NPC from the session
   * @param uuid the UUID of the character
   */
  const deleteNPC = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteNPC()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete NPC?', 'Are you sure you want to delete this NPC? This will not impact the associated Character')))
      return;
    
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
   * Deletes a vignette from the session
   * @param uuid the UUID of the vignette
   */
  const deleteVignette = async (uuid: string): Promise<void> => {
    if (!currentSession.value)
      throw new Error('Invalid session in sessionStore.deleteVignette()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete vignette?', 'Are you sure you want to delete this vignette?')))
      return;
    
    await currentSession.value.deleteVignette(uuid);
    await _refreshVignetteRows();
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
      await campaign.mergeToDoItem(ToDoTypes.Vignette, `Delivered in session ${currentSession.value.number}`, uuid, currentSession.value.uuid);
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

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete lore?', 'Are you sure you want to delete this lore?')))
      return;
    
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

    const lore = currentSession.value.lore.find(l=> l.uuid===uuid);

    let campaign;
    if (lore)
      campaign = await currentSession.value.loadCampaign();

    if (lore && delivered && campaign) {
      await campaign.mergeToDoItem(ToDoTypes.Lore, `Delivered in session ${currentSession.value.number}`, uuid, currentSession.value.uuid);
    }

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

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete item?', 'Are you sure you want to delete this item?')))
      return;
    
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

    const entry = await fromUuid<Item>(uuid);

    let campaign;
    if (entry)
      campaign = await currentSession.value.loadCampaign();

    if (entry && delivered && campaign) {
      await campaign.mergeToDoItem(ToDoTypes.Item, `Delivered in session ${currentSession.value.number}`, uuid, currentSession.value.uuid);
    }

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

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete monster?', 'Are you sure you want to delete this monster?')))
      return;
    
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

    const entry = await fromUuid<Actor>(uuid);

    let campaign;
    if (entry)
      campaign = await currentSession.value.loadCampaign();

    if (entry && delivered && campaign) {
      await campaign.mergeToDoItem(ToDoTypes.Monster, `Delivered in session ${currentSession.value.number}`, uuid, currentSession.value.uuid);
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

  const getNextSession = async (): Promise<Session | null> => {
    let campaign;
    if (currentSession.value)
      campaign = await currentSession.value.loadCampaign();

    if (!currentSession.value || !campaign || currentSession.value.number===null)
      return null;

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
  // when we click on a journal entry, open it
  async function onJournalClick (_event: MouseEvent, uuid: string) {
    // get session Id
    const journalEntryPageId = relatedLoreRows.value.find(r=> r.uuid===uuid)?.journalEntryPageId;
    const journalEntryPage = await fromUuid<JournalEntryPage>(journalEntryPageId);

    if (journalEntryPage)
      journalEntryPage.sheet?.render(true);
  }

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

  // when we click on a todo item that has a UUID, open it
  async function onToDoClick (event: MouseEvent, uuid: string) {
    // make sure it's an entry (vs. lore, etc)
    const entry = await Entry.fromUuid(uuid);

    if (!entry)
      return;
        
    await navigationStore.openEntry(uuid, { newTab: event.ctrlKey, activate: true });
  }

  const _refreshRows = async () => {
    relatedLocationRows.value = [];
    relatedItemRows.value = [];
    relatedNPCRows.value = [];
    relatedMonsterRows.value = [];
    relatedVignetteRows.value = [];
    relatedLoreRows.value = [];

    if (!currentSession.value)
      return;

    await _refreshLocationRows();
    await _refreshItemRows();
    await _refreshNPCRows();
    await _refreshMonsterRows();
    await _refreshVignetteRows();
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

      if (!entry)
        continue;

      const parentId = await entry.getParentId();
      const parent = parentId ? await Entry.fromUuid(parentId) : null;
      const cleanDescription = await htmlToPlainTextReplaceUuid(entry.description);

      if (entry) {
        retval.push({
          uuid: location.uuid,
          delivered: location.delivered,
          name: entry.name, 
          type: entry.type,
          parent: parent?.name || '-',
          parentId: parent?.uuid || null,
          description: cleanDescription.substring(0, 99) + (cleanDescription.length>100 ? '...' : ''),
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
        const cleanDescription = await htmlToPlainTextReplaceUuid(entry.description);

        retval.push({
          uuid: npc.uuid,
          delivered: npc.delivered,
          name: entry.name, 
          type: entry.type,
          description: cleanDescription.substring(0, 99) + (cleanDescription.length>100 ? '...' : ''),
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
          dragTooltip: localize('tooltips.dragItemFromSession'),
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
      const entry = await fromUuid<Actor>(monster.uuid);

      if (entry) {
        retval.push({
          uuid: monster.uuid,
          delivered: monster.delivered,
          number: monster.number,
          name: entry.name, 
          dragTooltip: localize('tooltips.dragMonsterFromSession'),
        });
      }
    }

    relatedMonsterRows.value = retval;
  }


  const _refreshVignetteRows = async () => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionVignetteDetails[];

    for (const vignette of currentSession.value?.vignettes) {
      retval.push({
        uuid: vignette.uuid,
        delivered: vignette.delivered,
        description: vignette.description,
      });
    }

    relatedVignetteRows.value = retval;
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
        description: lore.description,
        journalEntryPageId: lore.journalEntryPageId,
        journalEntryPageName: entry?.name || null,
        packId: entry?.pack || null,
      });
    }

    relatedLoreRows.value = retval;
  }

  const _refreshRowsForTab = async () => {
    switch (currentContentTab.value) {
      case 'notes':
        await _refreshLocationRows();
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
    relatedItemRows,
    relatedNPCRows,
    relatedMonsterRows,
    relatedVignetteRows,
    relatedLoreRows,
    extraFields,
    lastSavedNotes,
    addLocation,
    addLocationToPlayedSession,
    deleteLocation,
    markLocationDelivered,
    moveLocationToNext,
    addItem,
    deleteItem,
    markItemDelivered,
    moveItemToNext,
    addNPC,
    addNPCToPlayedSession,
    deleteNPC,
    markNPCDelivered,
    moveNPCToNext,
    addMonster,
    deleteMonster,
    updateMonsterNumber,
    markMonsterDelivered,
    moveMonsterToNext,
    addVignette,
    deleteVignette,
    updateVignetteDescription,
    markVignetteDelivered,
    moveVignetteToNext,
    addLore,
    deleteLore,
    updateLoreDescription,
    updateLoreJournalEntry,
    markLoreDelivered,
    moveLoreToNext,
    moveLoreToCampaign,
  };
});