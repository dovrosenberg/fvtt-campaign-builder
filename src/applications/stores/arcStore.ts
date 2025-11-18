// this store handles activities specific to campaigns 
// 
// library imports
import { ref, watch, } from 'vue';
import { defineStore, storeToRefs, } from 'pinia';

// local imports
import { useMainStore, useNavigationStore, } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';

// types
import { 
  ArcLocationDetails, 
  FieldData, 
  ArcParticipantDetails, 
  ArcMonsterDetails, 
  ArcLoreDetails,
  Idea,
  Topics,
} from '@/types';
import { ArcLore, } from '@/documents';

import { Entry, } from '@/classes';
import { getTopicText } from '@/compendia';

export enum ArcTableTypes {
  None,
  Location,
  Participant,
  Monster,
  Lore,
  Idea,
}

// the store definition
export const useArcStore = defineStore('arc', () => {
  ///////////////////////////////
  // the state
  // used for tables
  const locationRows = ref<ArcLocationDetails[]>([]);
  const participantRows = ref<ArcParticipantDetails[]>([]);
  const monsterRows = ref<ArcMonsterDetails[]>([]);
  const loreRows = ref<ArcLoreDetails[]>([]); 
  const ideaRows = ref<Idea[]>([]);
  
  const extraFields = {
    [ArcTableTypes.None]: [],
    [ArcTableTypes.Location]: [
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick },
      { field: 'type', style: 'text-align: left', header: 'Type', sortable: true },
      { field: 'parent', style: 'text-align: left', header: 'Parent', sortable: true, onClick: onParentClick},
      { field: 'notes', style: 'text-align: left', header: 'Notes', editable: true },
    ],
    [ArcTableTypes.Participant]: [
      { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' },
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onItemClick },
      { field: 'type', style: 'text-align: left', header: 'Type', sortable: true },
      { field: 'notes', style: 'text-align: left', header: 'Notes', editable: true },
    ],  
    [ArcTableTypes.Monster]: [
      { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' },
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onMonsterClick },
      { field: 'notes', style: 'text-align: left', header: 'Notes', editable: true },
    ], 
    [ArcTableTypes.Lore]: [
      { field: 'description', style: 'text-align: left', header: 'Description', editable: true },
      { field: 'journalEntryPageName', style: 'text-align: left; width: 25%;max-width: 25%', header: 'Journal Page', editable: false,
        onClick: onJournalClick
      },
    ],  
    [ArcTableTypes.Idea]: [
      { field: 'text', style: 'text-align: left', header: 'Idea', sortable: true, editable: true },
    ],
  } as unknown as Record<ArcTableTypes, FieldData[]>;

  
  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentContentTab, currentArc, } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  
  /**
   * Adds a location to the arc.
   * @param uuid the UUID of the location to add.
   */
  const addLocation = async (uuid: string, notes: string = ''): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.addLocation()');

    await currentArc.value.addLocation(uuid, notes);
    await _refreshLocationRows();
  }

  /**
   * Deletes a location from the arc
   * @param uuid the UUID of the location
   */
  const deleteLocation = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteLocation()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete location?', 'Are you sure you want to delete this location? This will not impact the associated Setting Location')))
      return;

    await currentArc.value.deleteLocation(uuid);
    await _refreshLocationRows();
  }

  /**
   * Copy a location to the last session in the arc.
   * @param uuid the UUID of the location to copy
   */
  const copyLocationToSession = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const lastSession = await currentArc.value.getLastSession();

    if (!lastSession)
      return;

    await lastSession.addLocation(uuid);
  }

  /**
   * Adds a participant to the arc.
   * @param uuid the UUID of the character to add.
   */
  const addParticipant = async (uuid: string, notes: string = ''): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.addParticipant()');

    await currentArc.value.addParticipant(uuid, notes);
    await _refreshParticipantRows();
  }

  /**
   * Deletes a participant from the arc
   * @param uuid the UUID of the character
   */
  const deleteParticipant = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteParticipant()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete participant?', 'Are you sure you want to delete this participant? This will not impact the associated entry')))
      return;
    
    await currentArc.value.deleteParticipant(uuid);
    await _refreshParticipantRows();
  }


  /**
   * Copy a participant (only a character) to the last session in the arc.
   * @param uuid the UUID of the participant to copy
   */
  const copyParticipantToSession = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const lastSession = await currentArc.value.getLastSession();

    if (!lastSession)
      return;

    // need to make sure it's a character
    const character = await Entry.fromUuid(uuid);
    if (!character || character.topic!=Topics.Character)
      return;
 
    await lastSession.addNPC(uuid);
  }

  /**
   * Adds a lore to the arc.
   * @param description The description for the lore entry
   * @returns The UUID of the created lore entry
   */
  const addLore = async (description = ''): Promise<string | null> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.addLore()');

    const loreUuid = await currentArc.value.addLore(description);
    await _refreshLoreRows();
    return loreUuid;
  }

  /**
   * Updates the description associated with a lore 
   * @param uuid the UUID of the lore
   */
  const updateLoreDescription = async (uuid: string, description: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateLoreDescription()');

    await currentArc.value.updateLoreDescription(uuid, description);
    await _refreshLoreRows();
  }
  
  /**
   * Updates the notes on a location
   * @param uuid the UUID of the location
   */
  const updateLocationNotes = async (uuid: string, notes: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateLocationNotes()');

    await currentArc.value.updateLocationNotes(uuid, notes);
    await _refreshLocationRows();
  }

  /**
   * Updates the journal entry associated with a lore 
   * @param loreUuid the UUID of the lore
   * @param journalEntryPageUuid the UUID of the journal entry page (or null)
   */
  const updateLoreJournalEntry = async (loreUuid: string, journalEntryPageUuid: string | null): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateLoreJournalEntry()');

    await currentArc.value.updateLoreJournalEntry(loreUuid, journalEntryPageUuid);
    await _refreshLoreRows();
  }

    /**
   * Updates the notes associated with a participant 
   * @param uuid the UUID of the participant
   */
  const updateParticipantNotes = async (uuid: string, description: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateParticipantNotes()');

    await currentArc.value.updateParticipantNotes(uuid, description);
    await _refreshParticipantRows();
  }

  /**
   * Deletes a lore from the arc
   * @param uuid the UUID of the l0ore
   */
  const deleteLore = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteLore()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete lore?', 'Are you sure you want to delete this lore?')))
      return;
    
    await currentArc.value.deleteLore(uuid);
    await _refreshLoreRows();
  }

  /**
   * Move a lore to the last session in the arc.
   * @param uuid the UUID of the lore to move
   */
  const moveLoreToSession = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const lastSession = await currentArc.value.getLastSession();

    if (!lastSession)
      return;

    const lore = currentArc.value.lore.find(l=> l.uuid===uuid);

    if (!lore)
      return;

    await lastSession.addLore(lore.description);
    await currentArc.value.deleteLore(uuid);

    await _refreshLoreRows();
  }

  /**
   * Move a lore back to the campaign as unused.
   * @param uuid the UUID of the lore to move
   */
  const moveLoreToCampaign = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const currentLore = currentArc.value.lore.find(l=> l.uuid===uuid);

    if (!currentLore)
      return;

    const campaign = await currentArc.value.loadCampaign();

    if (!campaign) 
      return;
    
    // have a next campaign - add there and delete here
    await campaign.addLore(currentLore.description);
    await currentArc.value.deleteLore(uuid);

    await _refreshLoreRows();
  }

  /**
   * Adds a monster to the arc.
   * @param uuid the UUID of the actor to add.
   */
  const addMonster = async (uuid: string, notes: string = ''): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.addMonster()');

    await currentArc.value.addMonster(uuid, notes);
    await _refreshMonsterRows();
  }

  /**
   * Deletes a monster from the arc
   * @param uuid the UUID of the actor
   */
  const deleteMonster = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteMonster()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete monster?', 'Are you sure you want to delete this monster?')))
      return;
    
    await currentArc.value.deleteMonster(uuid);
    await _refreshMonsterRows();
  }

    /**
   * Updates the notes on a monster
   * @param uuid the UUID of the monster
   */
  const updateMonsterNotes = async (uuid: string, notes: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateMonsterNotes()');

    await currentArc.value.updateMonsterNotes(uuid, notes);
    await _refreshMonsterRows();
  }

  /**
   * Copy a monster to the last session in the arc.
   * @param uuid the UUID of the monster to copy
   */
  const copyMonsterToSession = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const lastSession = await currentArc.value.getLastSession();

    if (!lastSession)
      return;

    await lastSession.addMonster(uuid);
  }

  const reorderLore = async (reorderedLore: ArcLore[]) => {
    if (!currentArc.value) return;

    currentArc.value.lore = reorderedLore;
    await currentArc.value.save();
    await _refreshLoreRows();
  };

     /**
     * Adds a lore to the arc.
     * @param description The description for the idea
     * @returns The UUID of the created idea
     */
    const addIdea = async (description = ''): Promise<string | null> => {
      if (!currentArc.value)
        throw new Error('Invalid arc in arcStore.addIdea()');
  
      const ideaUuid = await currentArc.value.addIdea(description);
      await _refreshIdeaRows();
      return ideaUuid;
    }
  
    const updateIdea = async (uuid: string, newText: string): Promise<void> => {
      if (!currentArc.value)
        return;
  
      await currentArc.value.updateIdea(uuid, newText);
      await _refreshIdeaRows();
    }
  
    const deleteIdea = async (uuid: string): Promise<void> => {
      if (!currentArc.value)
        return;
  
      // confirm
      if (!(await FCBDialog.confirmDialog('Delete Idea?', 'Are you sure you want to delete this idea?')))
        return;
  
      await currentArc.value.deleteIdea(uuid);
      await _refreshIdeaRows();
    }
  
    const reorderIdeas = async (reorderedIdeas: Idea[]) => {
      if (!currentArc.value) return;
  
      currentArc.value.ideas = reorderedIdeas;
      await currentArc.value.save();
      await _refreshIdeaRows();
    };
  
    const moveIdeaToCampaign = async (uuid: string): Promise<void> => {
      if (!currentArc.value)
        return;

      await currentArc.value.moveIdeaToCampaign(uuid);
      await _refreshIdeaRows();
    }

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  // when we click on a journal entry, open it
  async function onJournalClick (_event: MouseEvent, uuid: string) {
    // get session Id
    const journalEntryPageId = loreRows.value.find(r=> r.uuid===uuid)?.journalEntryPageId;
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
    const parentId = locationRows.value.find(r=> r.uuid===uuid)?.parentId;

    if (parentId)
      navigationStore.openEntry(parentId, { newTab: event.ctrlKey, activate: true });
  }


  // const _refreshRows = async () => {
  //   locationRows.value = [];
  //   participantRows.value = [];
  //   locationRows.value = [];
  //   loreRows.value = [];
  //   ideaRows.value = [];

  //   if (!currentSession.value)
  //     return;

  //   await _refreshLocationRows();
  //   await _refreshItemRows();
  //   await _refreshNPCRows();
  //   await _refreshMonsterRows();
  //   await _refreshVignetteRows();
  //   await _refreshLoreRows();
  // };

  const _refreshLocationRows = async () => {
    if (!currentArc.value)
      return;

    const retval = [] as ArcLocationDetails[];

    for (const location of currentArc.value?.locations) {
      const entry = await Entry.fromUuid(location.uuid);

      if (!entry)
        continue;

      const parentId = await entry.getParentId();
      const parent = parentId ? await Entry.fromUuid(parentId) : null;

      if (entry) {
        retval.push({
          uuid: location.uuid,
          name: entry.name, 
          type: entry.type,
          parent: parent?.name || '',
          parentId: parent?.uuid || null,
          notes: location.notes,
        });
      }
    }

    locationRows.value = retval;
  }


  const _refreshParticipantRows = async () => {
    if (!currentArc.value)
      return;

    // note these can be character or organization
    const retval = [] as ArcParticipantDetails[];

    for (const participant of currentArc.value?.participants) {
      const entry = await Entry.fromUuid(participant.uuid);

      if (entry) {
        retval.push({
          uuid: participant.uuid,
          name: entry.name, 
          type: entry.type || getTopicText(entry.topic),
          notes: participant.notes
        });
      }
    }

    participantRows.value = retval;
  }

  const _refreshMonsterRows = async () => {
    if (!currentArc.value)
      return;

    const retval = [] as ArcMonsterDetails[];

    for (const monster of currentArc.value?.monsters) {
      const entry = await fromUuid<Actor>(monster.uuid);

      if (entry) {
        retval.push({
          uuid: monster.uuid,
          name: entry.name, 
          notes: monster.notes
        });
      } else {
        // the actor was deleted - remove it from our session
        await currentArc.value.deleteMonster(monster.uuid);
      }
    }

    monsterRows.value = retval;
  }
  
  const _refreshIdeaRows = async () => {
    ideaRows.value = [];

    if (!currentArc.value)
      return;
    
    ideaRows.value = currentArc.value.ideas.slice();
  }

  const _refreshLoreRows = async () => {
    if (!currentArc.value)
      return;

    const retval = [] as ArcLoreDetails[];

    for (const lore of currentArc.value?.lore) {
      let entry: JournalEntryPage | null = null;

      if (lore.journalEntryPageId)
        entry = await fromUuid<JournalEntryPage>(lore.journalEntryPageId);

      retval.push({
        uuid: lore.uuid,
        description: lore.description,
        sortOrder: lore.sortOrder,
        journalEntryPageId: lore.journalEntryPageId,
        journalEntryPageName: entry?.name || null,
        packId: entry?.pack || null,
      });
    }

    loreRows.value = retval;
  }

  const _refreshRowsForTab = async () => {
    switch (currentContentTab.value) {
      case 'description':
        // await _refreshLocationRows();
        break;
      case 'ideas':
        await _refreshIdeaRows();
        break;
      case 'lore':
        await _refreshLoreRows();
        break;
      case 'locations':
        await _refreshLocationRows();
        break;
      case 'participants':
        await _refreshParticipantRows();
        break;
      case 'monsters':
        await _refreshMonsterRows();
        break;
      default:
        break;
    }
  }


  ///////////////////////////////
  // watchers
  watch(()=> currentArc.value, async () => {
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
    locationRows,
    participantRows,
    monsterRows,
    ideaRows,
    loreRows,
    extraFields,
    addIdea, 
    deleteIdea,
    updateIdea,
    moveIdeaToCampaign,
    reorderIdeas,
    addLocation,
    deleteLocation,
    copyLocationToSession,
    updateLocationNotes,
    addParticipant,
    deleteParticipant,
    copyParticipantToSession,
    updateParticipantNotes,
    addMonster,
    deleteMonster,
    copyMonsterToSession,
    updateMonsterNotes,
    addLore,
    deleteLore,
    reorderLore,
    updateLoreDescription,
    updateLoreJournalEntry,
    moveLoreToSession,
    moveLoreToCampaign,
  };
});