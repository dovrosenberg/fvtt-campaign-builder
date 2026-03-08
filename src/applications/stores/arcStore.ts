// this store handles activities specific to arcs
//
// library imports
import { storeToRefs, } from 'pinia';

// local imports
import { useMainStore, useNavigationStore, } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';
import { createGroupedTableStores } from '@/composables/createGroupedTableStores';

// types
import {
  BaseTableColumn,
  ArcIdea,
  Topics,
  ArcTableTypes,
  GroupableItem,
  ArcLocation, 
  ArcLore, 
  ArcMonster, 
  ArcItem,
  ArcParticipant, 
  ArcVignette, 
} from '@/types';

import { Entry, } from '@/classes';

// the store definition
export const arcStore = () => {
  ///////////////////////////////
  // the state
  const extraFields = {
    [ArcTableTypes.None]: [],
    [ArcTableTypes.Location]: [
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onNameClick },
      { field: 'type', style: 'text-align: left', header: 'Type', sortable: true },
      { field: 'parent', style: 'text-align: left', header: 'Parent', sortable: true, onClick: onParentClick },
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
    [ArcTableTypes.Item]: [
      { field: 'drag', style: 'text-align: center; width: 40px; max-width: 40px', header: '' },
      { field: 'name', style: 'text-align: left', header: 'Name', sortable: true, onClick: onItemClick },
      { field: 'notes', style: 'text-align: left', header: 'Notes', editable: true },
    ],
    [ArcTableTypes.Vignette]: [
      { field: 'description', style: 'text-align: left', header: 'Vignette', editable: true },
    ],
    [ArcTableTypes.Lore]: [
      { field: 'description', style: 'text-align: left', header: 'Description', editable: true },
    ],
    [ArcTableTypes.Idea]: [
      { field: 'text', style: 'text-align: left', header: 'Idea', sortable: true, editable: true },
    ],
  } as unknown as Record<ArcTableTypes, BaseTableColumn[]>;


  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentArc, } = storeToRefs(mainStore);

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
    mainStore.refreshArc();
  }

  /**
   * Deletes a location from the arc.
   * @param uuid - The UUID of the location to delete.
   * @param skipConfirm - If true, skip the confirmation dialog.
   * @returns True if the location was deleted, false if the user canceled.
   */
  const deleteLocation = async (uuid: string, skipConfirm = false): Promise<boolean> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteLocation()');

    // confirm
    if (!skipConfirm && !(await FCBDialog.confirmDialog('Delete location?', 'Are you sure you want to delete this location? This will not impact the associated Setting Location')))
      return false;

    await currentArc.value.deleteLocation(uuid);
    mainStore.refreshArc();
    return true;
  }

  /**
   * Copy a location to the current session in the campaign.
   * @param uuid the UUID of the location to copy
   */
  const copyLocationToSession = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const campaign = await currentArc.value.loadCampaign();
    if (!campaign)
      throw new Error('Invalid campaign in arcStore.copyLocationToSession()');

    const currentSession = await campaign.getCurrentSession();

    if (!currentSession)
      return;

    await currentSession.addLocation(uuid);
  }

  /**
   * Reorders locations on the arc (persisting the new array order).
   * @param reorderedLocations the reordered location array
   */
  const reorderLocations = async (reorderedLocations: ArcLocation[]): Promise<void> => {
    if (!currentArc.value)
      return;

    currentArc.value.locations = reorderedLocations;
    await currentArc.value.save();
    mainStore.refreshArc();
  };

  /**
   * Adds a participant to the arc.
   * @param uuid the UUID of the character to add.
   */
  const addParticipant = async (uuid: string, notes: string = ''): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.addParticipant()');

    await currentArc.value.addParticipant(uuid, notes);
    mainStore.refreshArc();
  }

  /**
   * Deletes a participant from the arc.
   * @param uuid - The UUID of the participant (character or organization) to delete.
   * @param skipConfirm - If true, skip the confirmation dialog.
   * @returns True if the participant was deleted, false if the user canceled.
   */
  const deleteParticipant = async (uuid: string, skipConfirm = false): Promise<boolean> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteParticipant()');

    // confirm
    if (!skipConfirm && !(await FCBDialog.confirmDialog('Delete participant?', 'Are you sure you want to delete this participant? This will not impact the associated entry')))
      return false;

    await currentArc.value.deleteParticipant(uuid);
    mainStore.refreshArc();
    return true;
  }


  /**
   * Copy a participant (only a character) to the current session in the campaign.
   * @param uuid the UUID of the participant to copy
   */
  const copyParticipantToSession = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const campaign = await currentArc.value.loadCampaign();
    if (!campaign)
      throw new Error('Invalid campaign in arcStore.copyParticipantToSession()');

    const currentSession = await campaign.getCurrentSession();
    if (!currentSession)
      throw new Error('Invalid session in arcStore.copyParticipantToSession()');

    // need to make sure it's a character
    const character = await Entry.fromUuid(uuid);
    if (!character || character.topic!=Topics.Character)
      return;

    await currentSession.addNPC(uuid);
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
    mainStore.refreshArc();
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
    mainStore.refreshArc();
  }

  /**
   * Updates the notes on a location
   * @param uuid the UUID of the location
   */
  const updateLocationNotes = async (uuid: string, notes: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateLocationNotes()');

    await currentArc.value.updateLocationNotes(uuid, notes);
    mainStore.refreshArc();
  }

    /**
   * Updates the notes associated with a participant
   * @param uuid the UUID of the participant
   */
  const updateParticipantNotes = async (uuid: string, description: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateParticipantNotes()');

    await currentArc.value.updateParticipantNotes(uuid, description);
    mainStore.refreshArc();
  }

  /**
   * Deletes a lore entry from the arc.
   * @param uuid - The UUID of the lore entry to delete.
   * @returns True if the lore was deleted, false if the user canceled.
   */
  const deleteLore = async (uuid: string): Promise<boolean> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteLore()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete lore?', 'Are you sure you want to delete this lore?')))
      return false;

    await currentArc.value.deleteLore(uuid);
    mainStore.refreshArc();
    return true;
  }

  /**
   * Adds a vignette to the arc.
   * @param description The description for the vignette
   * @returns The UUID of the created vignette
   */
  const addVignette = async (description = ''): Promise<string | null> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.addVignette()');

    const vignetteUuid = await currentArc.value.addVignette(description);
    mainStore.refreshArc();
    return vignetteUuid;
  }

  /**
   * Updates the vignette description
   * @param uuid the UUID of the vignette
   */
  const updateVignetteDescription = async (uuid: string, description: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateVignetteDescription()');

    await currentArc.value.updateVignetteDescription(uuid, description);
    mainStore.refreshArc();
  }

  /**
   * Deletes a vignette entry from the arc.
   * @param uuid - The UUID of the vignette entry to delete.
   * @returns True if the vignette was deleted, false if the user canceled.
   */
  const deleteVignette = async (uuid: string): Promise<boolean> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteVignette()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete vignette?', 'Are you sure you want to delete this vignette?')))
      return false;

    await currentArc.value.deleteVignette(uuid);
    mainStore.refreshArc();
    return true;
  }

  /**
   * Move a vignette to the current session in the campaign.
   * @param uuid the UUID of the vignette to move
   * @param description the vignette description
   */
  const moveVignetteToSession = async (uuid: string, description: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const campaign = await currentArc.value.loadCampaign();
    if (!campaign)
      throw new Error('Invalid campaign in arcStore.moveVignetteToSession()');

    const currentSession = await campaign.getCurrentSession();
    if (!currentSession)
      throw new Error('Invalid session in arcStore.moveVignetteToSession()');

    await currentSession.addVignette(description);
    await currentArc.value.deleteVignette(uuid);
    mainStore.refreshArc();
  }

  /**
   * Move a lore to the current session in the campaign.
   * @param uuid the UUID of the lore to move
   * @param description the lore description
   */
  const moveLoreToSession = async (uuid: string, description: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const campaign = await currentArc.value.loadCampaign();
    if (!campaign)
      throw new Error('Invalid campaign in arcStore.moveLoreToSession()');

    const currentSession = await campaign.getCurrentSession();
    if (!currentSession)
      throw new Error('Invalid session in arcStore.moveLoreToSession()');

    await currentSession.addLore(description);
    await currentArc.value.deleteLore(uuid);

    mainStore.refreshArc();
  }

  /**
   * Move a lore back to the campaign as unused.
   * @param uuid the UUID of the lore to move
   * @param description the lore description
   */
  const moveLoreToCampaign = async (uuid: string, description: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const campaign = await currentArc.value.loadCampaign();

    if (!campaign)
      return;

    // have a campaign - add there and delete here
    await campaign.addLore(description);
    await currentArc.value.deleteLore(uuid);

    mainStore.refreshArc();
  }

  /**
   * Adds a monster to the arc.
   * @param uuid the UUID of the actor to add.
   */
  const addMonster = async (uuid: string, notes: string = ''): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.addMonster()');

    await currentArc.value.addMonster(uuid, notes);
    mainStore.refreshArc();
  }

  /**
   * Deletes a monster from the arc.
   * @param uuid - The UUID of the actor to delete.
   * @returns True if the monster was deleted, false if the user canceled.
   */
  const deleteMonster = async (uuid: string): Promise<boolean> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteMonster()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete monster?', 'Are you sure you want to delete this monster?')))
      return false;

    await currentArc.value.deleteMonster(uuid);
    mainStore.refreshArc();
    return true;
  }

    /**
   * Updates the notes on a monster
   * @param uuid the UUID of the monster
   */
  const updateMonsterNotes = async (uuid: string, notes: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateMonsterNotes()');

    await currentArc.value.updateMonsterNotes(uuid, notes);
    mainStore.refreshArc();
  }

  /**
   * Copy a monster to the current session in the campaign.
   * @param uuid the UUID of the monster to copy
   */
  const copyMonsterToSession = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const campaign = await currentArc.value.loadCampaign();
    if (!campaign)
      throw new Error('Invalid campaign in arcStore.copyMonsterToSession()');

    const currentSession = await campaign.getCurrentSession();
    if (!currentSession)
      throw new Error('Invalid session in arcStore.copyMonsterToSession()');

    await currentSession.addMonster(uuid);
  }

  /**
   * Reorders participants on the arc (persisting the new array order).
   * @param reorderedParticipants the reordered participant array
   */
  const reorderParticipants = async (reorderedParticipants: ArcParticipant[]): Promise<void> => {
    if (!currentArc.value)
      return;

    currentArc.value.participants = reorderedParticipants;
    await currentArc.value.save();
    mainStore.refreshArc();
  };

  /**
   * Reorders monsters on the arc (persisting the new array order).
   * @param reorderedMonsters the reordered monster array
   */
  const reorderMonsters = async (reorderedMonsters: ArcMonster[]): Promise<void> => {
    if (!currentArc.value)
      return;

    currentArc.value.monsters = reorderedMonsters;
    await currentArc.value.save();
    mainStore.refreshArc();
  };

  /**
   * Adds an item to the arc.
   * @param uuid the UUID of the item to add.
   */
  const addItem = async (uuid: string, notes: string = ''): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.addItem()');

    await currentArc.value.addItem(uuid, notes);
    mainStore.refreshArc();
  }

  /**
   * Deletes an item from the arc.
   * @param uuid - The UUID of the item to delete.
   * @returns True if the item was deleted, false if the user canceled.
   */
  const deleteItem = async (uuid: string): Promise<boolean> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.deleteItem()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete item?', 'Are you sure you want to delete this item?')))
      return false;

    await currentArc.value.deleteItem(uuid);
    mainStore.refreshArc();
    return true;
  }

  /**
   * Updates the notes on an item
   * @param uuid the UUID of the item
   */
  const updateItemNotes = async (uuid: string, notes: string): Promise<void> => {
    if (!currentArc.value)
      throw new Error('Invalid arc in arcStore.updateItemNotes()');

    await currentArc.value.updateItemNotes(uuid, notes);
    mainStore.refreshArc();
  }

  /**
   * Copy an item to the current session in the campaign.
   * @param uuid the UUID of the item to copy
   */
  const copyItemToSession = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    const campaign = await currentArc.value.loadCampaign();
    if (!campaign)
      throw new Error('Invalid campaign in arcStore.copyItemToSession()');

    const currentSession = await campaign.getCurrentSession();
    if (!currentSession)
      throw new Error('Invalid session in arcStore.copyItemToSession()');

    await currentSession.addItem(uuid);
  }

  /**
   * Reorders items on the arc (persisting the new array order).
   * @param reorderedItems the reordered item array
   */
  const reorderItems = async (reorderedItems: ArcItem[]): Promise<void> => {
    if (!currentArc.value)
      return;

    currentArc.value.items = reorderedItems;
    await currentArc.value.save();
    mainStore.refreshArc();
  };

  /**
   * Reorders story webs on the arc (persisting the new array order).
   * @param reorderedStoryWebIds the reordered story web id array
   */
  const reorderStoryWebs = async (reorderedStoryWebIds: string[]): Promise<void> => {
    if (!currentArc.value)
      return;

    currentArc.value.storyWebs = reorderedStoryWebIds;
    await currentArc.value.save();
    await mainStore.refreshCurrentContent();
  };

  const reorderVignettes = async (reorderedVignettes: ArcVignette[]): Promise<void> => {
    if (!currentArc.value)
      return;

    currentArc.value.vignettes = reorderedVignettes;
    await currentArc.value.save();
    mainStore.refreshArc();
  };

  const reorderLore = async (reorderedLore: ArcLore[]) => {
    if (!currentArc.value) return;

    currentArc.value.lore = reorderedLore;
    await currentArc.value.save();
    mainStore.refreshArc();
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
    mainStore.refreshArc();
    return ideaUuid;
  }

  const updateIdea = async (uuid: string, newText: string): Promise<void> => {
    if (!currentArc.value)
      return;

    await currentArc.value.updateIdea(uuid, newText);
    mainStore.refreshArc();
  }

  /**
   * Deletes an idea from the arc.
   * @param uuid - The UUID of the idea to delete.
   * @returns True if the idea was deleted, false if the user canceled.
   */
  const deleteIdea = async (uuid: string): Promise<boolean> => {
    if (!currentArc.value)
      return false;

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete Idea?', 'Are you sure you want to delete this idea?')))
      return false;

    await currentArc.value.deleteIdea(uuid);
    mainStore.refreshArc();
    return true;
  }

  const reorderIdeas = async (reorderedIdeas: ArcIdea[]) => {
    if (!currentArc.value) return;

    currentArc.value.ideas = reorderedIdeas;
    await currentArc.value.save();
    mainStore.refreshArc();
  };

  const moveIdeaToCampaign = async (uuid: string): Promise<void> => {
    if (!currentArc.value)
      return;

    await currentArc.value.moveIdeaToCampaign(uuid);
    mainStore.refreshArc();
  }

  ///////////////////////////////
  // Generic grouped table stores
  
  // Multi-group store for all grouped items in the arc
  const groupStores = createGroupedTableStores({
    currentEntity: currentArc,
    refresh: mainStore.refreshArc,
    groupConfigs: {
      [GroupableItem.ArcIdeas]: {
        propertyName: 'ideas',
      },
      [GroupableItem.ArcLore]: {
        propertyName: 'lore',
      },
      [GroupableItem.ArcVignettes]: {
        propertyName: 'vignettes',
      },
      [GroupableItem.ArcLocations]: {
        propertyName: 'locations',
      },
      [GroupableItem.ArcParticipants]: {
        propertyName: 'participants',
      },
      [GroupableItem.ArcMonsters]: {
        propertyName: 'monsters',
      },
      [GroupableItem.ArcItems]: {
        propertyName: 'items',
      },
    },
  });

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions

  // when we click on an item, open it
  async function onItemClick (_event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) {
    const item = await foundry.utils.fromUuid<Item>(rowData.uuid);

    if (item)
      item.sheet?.render(true);
  }

  // when we click on a monster, open it
  async function onMonsterClick (_event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) {
    const monster = await foundry.utils.fromUuid<Actor>(rowData.uuid);

    if (monster)
      monster.sheet?.render(true);
  }

  // when we click on a name, open the entry
  async function onNameClick (event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) {
    navigationStore.openEntry(rowData.uuid, { newTab: event.ctrlKey, activate: true });
  }

  // when we click on a parent, open the parent entry using parentId from row data
  async function onParentClick (event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) {
    const parentId = rowData.parentId as string | null;
    if (parentId)
      navigationStore.openEntry(parentId, { newTab: event.ctrlKey, activate: true, panelIndex: event.altKey ? -1 : undefined });
  }


  ///////////////////////////////
  // watchers

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
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
    reorderLocations,
    addParticipant,
    deleteParticipant,
    copyParticipantToSession,
    updateParticipantNotes,
    reorderParticipants,
    addMonster,
    deleteMonster,
    copyMonsterToSession,
    updateMonsterNotes,
    reorderMonsters,
    addItem,
    deleteItem,
    copyItemToSession,
    updateItemNotes,
    reorderItems,
    reorderStoryWebs,
    addVignette,
    deleteVignette,
    updateVignetteDescription,
    moveVignetteToSession,
    reorderVignettes,
    addLore,
    deleteLore,
    reorderLore,
    updateLoreDescription,
    moveLoreToSession,
    moveLoreToCampaign,
    groupStores,
  };
};
