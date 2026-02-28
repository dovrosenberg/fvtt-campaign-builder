// this store handles actions specific to campaigns
//
// library imports
import { storeToRefs, } from 'pinia';
import { computed } from 'vue';

// local imports
import { useCampaignDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';
import { createGroupedTableStores } from '@/composables/createGroupedTableStores';

// types
import { BaseTableColumn, ToDoTypes, CampaignTableTypes, GroupableItem,CampaignLoreRow,CampaignToDo,CampaignIdea,CampaignPC } from '@/types';
import { Arc, Campaign, Entry, Session } from '@/classes';
import { localize } from '@/utils/game';
import { notifyWarn } from '@/utils/notifications';

// the store definition
export const campaignStore = () => {
  ///////////////////////////////
  // the state

  const extraFields = {
    [CampaignTableTypes.None]: [],
    [CampaignTableTypes.PC]: [],
    [CampaignTableTypes.Lore]: [
      { field: 'description', style: 'text-align: left; width: 100%', header: 'Description', editable: true },
    ],
    [CampaignTableTypes.DeliveredLore]: [
      { field: 'description', style: 'text-align: left; width: 70%', header: 'Description', editable: true },
      { field: 'lockedToSessionName', style: 'text-align: left; width: 30%', header: 'Delivered in', sortable: true,
        editable: false, onClick: onSessionClick
      },
    ],
    [CampaignTableTypes.ToDo]: [
      { field: 'lastTouched', style: 'text-align: left', header: 'Last modified', sortable: true, },
      { field: 'entry', style: 'text-align: left', header: 'Reference', sortable: true, onClick: onToDoClick },
      { field: 'text', style: 'text-align: left', header: 'To Do Item', sortable: true, editable: true },
    ],
    [CampaignTableTypes.Idea]: [
      { field: 'text', style: 'text-align: left', header: 'Idea', sortable: true, editable: true },
    ],
  } as Record<CampaignTableTypes, BaseTableColumn[]>;

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentCampaign, currentSession, currentSetting, } = storeToRefs(mainStore);

  ///////////////////////////////
  // computed state
  const availableCampaigns = computed((): Campaign[] => {
    if (!currentSetting.value)
      return [];

    let campaigns = [] as Campaign[];
    for (const campaignId in currentSetting.value.campaigns) {
      campaigns.push(currentSetting.value.campaigns[campaignId]);
    }

    return campaigns;
  });

  ///////////////////////////////
  // actions
  /** add PC to current campaign */
  const addPC = async (pc: CampaignPC): Promise<void> => {
    const campaign = currentCampaign.value || await currentSession.value?.loadCampaign();

    if (!campaign)
      return;

    campaign.pcs = [...campaign.pcs, pc];
    await campaign.save();

    await mainStore.refreshCampaign();
    await mainStore.refreshCurrentContent();
  };

  /** removes from the campaign - not the entry */
  const deletePC = async (uuid: string): Promise<void> => {
    const campaign = currentCampaign.value || await currentSession.value?.loadCampaign();

    if (!campaign)
      return;

    // confirm
    if (!(await FCBDialog.confirmDialog(localize('dialogs.confirmDeletePC.title'), localize('dialogs.confirmDeletePC.message'))))
      return;

    campaign.pcs = campaign.pcs.filter(pc => pc.uuid !== uuid);
    await campaign.save();

    await mainStore.refreshCampaign();
    await mainStore.refreshCurrentContent();
  };

  /**
   * Reorders PCs in the campaign (persisting the new array order).
   * @param reorderedPCs the reordered PC array
   */
  const reorderPCs = async (reorderedPCs: CampaignPC[]): Promise<void> => {
    const campaign = currentCampaign.value || await currentSession.value?.loadCampaign();
    if (!campaign)
      return;

    campaign.pcs = reorderedPCs;
    await campaign.save();

    await mainStore.refreshCampaign();
    await mainStore.refreshCurrentContent();
  };

  /**
   * Reorders story webs on the campaign (persisting the new array order).
   * @param reorderedStoryWebIds the reordered story web id array
   */
  const reorderStoryWebs = async (reorderedStoryWebIds: string[]): Promise<void> => {
    const campaign = currentCampaign.value || await currentSession.value?.loadCampaign();
    if (!campaign)
      return;

    campaign.storyWebs = reorderedStoryWebIds;
    await campaign.save();

    await mainStore.refreshCurrentContent();
  };

  /**
   * Adds a lore to the campaign.
   * @param description The description for the lore entry
   * @returns The UUID of the created lore entry
   */
  const addLore = async (description = ''): Promise<string | null> => {
    if (!currentCampaign.value)
      throw new Error('Invalid campaign in campaignStore.addLore()');

    const loreUuid = await currentCampaign.value.addLore(description);
    await mainStore.refreshCampaign();
    return loreUuid;
  };

  /**
   * Updates the description associated with a lore.
   * @param uuid the UUID of the lore
   * @param description the new description
   * @param sessionId the session UUID if the lore is session-level, or null for campaign-level
   */
  const updateLoreDescription = async (uuid: string, description: string, sessionId: string | null): Promise<void> => {
    if (!currentCampaign.value)
      throw new Error('Invalid session in campaignStore.updateLoreDescription()');

    if (sessionId) {
      // session-level lore
      const session = await Session.fromUuid(sessionId);
      if (!session)
        throw new Error('Session not found in campaignStore.updateLoreDescription()');

      await session.updateLoreDescription(uuid, description);
    } else {
      await currentCampaign.value.updateLoreDescription(uuid, description);
    }

    await mainStore.refreshCampaign();
  };

  /**
   * Deletes a lore from the campaign or session.
   * @param uuid the UUID of the lore
   * @param sessionId the session UUID if the lore is session-level, or null for campaign-level
   */
  const deleteLore = async (uuid: string, sessionId: string | null): Promise<void> => {
    if (!currentCampaign.value)
      throw new Error('Invalid session in campaignStore.deleteLore()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete Lore?', 'Are you sure you want to delete this lore?')))
      return;

    if (sessionId) {
      // session-level lore
      const session = await Session.fromUuid(sessionId);
      if (!session)
        throw new Error('Session not found in campaignStore.deleteLore()');

      await session.deleteLore(uuid);
    } else {
      await currentCampaign.value.deleteLore(uuid);
    }

    await mainStore.refreshCampaign();
  };

  /**
   * Set the delivered status for a given lore.
   * @param uuid the UUID of the lore
   * @param delivered the new delivered status
   * @param sessionId the session UUID if the lore is session-level, or null for campaign-level
   */
  const markLoreDelivered = async (uuid: string, delivered: boolean, sessionId: string | null): Promise<void> => {
    if (!currentCampaign.value)
      throw new Error('Invalid session in campaignStore.markLoreDelivered()');

    if (sessionId) {
      // session-level lore
      const session = await Session.fromUuid(sessionId);
      if (!session)
        throw new Error('Session not found in campaignStore.markLoreDelivered()');

      await session.markLoreDelivered(uuid, delivered);
    } else {
      await currentCampaign.value.markLoreDelivered(uuid, delivered);
    }

    await mainStore.refreshCampaign();
  };

  /**
   * Move a lore to the last session in the campaign, creating if needed.
   * @param uuid the UUID of the lore to move
   * @param description the lore description
   */
  const moveLoreToLastSession = async (uuid: string, description: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    const lastSession = await _getLastSession();

    if (!lastSession)
      return;

    // have a next session - add there and delete here
    await lastSession.addLore(description);
    await currentCampaign.value.deleteLore(uuid);

    await mainStore.refreshCampaign();
  };

  /**
   * Move a lore to the last arc in the campaign.
   * @param uuid the UUID of the lore to move
   * @param description the lore description
   */
  const moveLoreToArc = async (uuid: string, description: string): Promise<void> => {
    if (!currentCampaign.value || currentCampaign.value.arcIndex.length === 0)
      return;

    const lastArc = await Arc.fromUuid(currentCampaign.value.arcIndex[currentCampaign.value.arcIndex.length - 1].uuid);

    if (!lastArc)
      return;

    // have a next session - add there and delete here
    await lastArc.addLore(description);
    await currentCampaign.value.deleteLore(uuid);

    await mainStore.refreshCampaign();
  };

  /** Add a to-do item to the campaign */
  const addToDoItem = async (type: ToDoTypes, text: string, linkedUuid?: string, sessionUuid?: string): Promise<CampaignToDo | null> => {
    if (!currentCampaign.value)
      return null;

    const newItem = await currentCampaign.value.addNewToDoItem(type, text, linkedUuid, sessionUuid);
    await mainStore.refreshCampaign();
    return newItem;
  };

  /** Merge a to-do item (add or update existing) */
  const mergeToDoItem = async (type: ToDoTypes, text: string, linkedUuid?: string, sessionUuid?: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.mergeToDoItem(type, text, linkedUuid, sessionUuid);
    await mainStore.refreshCampaign();
  };

  /** Update a to-do item description */
  const updateToDoItem = async (uuid: string, newDescription: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.updateToDoItem(uuid, newDescription);
    await mainStore.refreshCampaign();
  };

  /** Complete (remove) a to-do item */
  const completeToDoItem = async (uuid: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.completeToDoItem(uuid);
    await mainStore.refreshCampaign();
  };

  /**
   * Adds an idea to the campaign.
   * @param description The description for the idea
   * @returns The UUID of the created idea
   */
  const addIdea = async (description = ''): Promise<string | null> => {
    if (!currentCampaign.value)
      throw new Error('Invalid campaign in campaignStore.addIdea()');

    const ideaUuid = await currentCampaign.value.addIdea(description);
    await mainStore.refreshCampaign();
    return ideaUuid;
  };

  /** Update an idea's text */
  const updateIdea = async (uuid: string, newText: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.updateIdea(uuid, newText);
    await mainStore.refreshCampaign();
  };

  /** Delete an idea from the campaign */
  const deleteIdea = async (uuid: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete Idea?', 'Are you sure you want to delete this idea?')))
      return;

    await currentCampaign.value.deleteIdea(uuid);
    await mainStore.refreshCampaign();
  };

  /** Reorder ideas in the campaign */
  const reorderIdeas = async (reorderedIdeas: CampaignIdea[]) => {
    if (!currentCampaign.value) return;

    currentCampaign.value.ideas = reorderedIdeas;
    await currentCampaign.value.save();
    await mainStore.refreshCampaign();
  };

  /** Move an idea to the last arc */
  const moveIdeaToArc = async (uuid: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.moveIdeaToArc(uuid);
    await mainStore.refreshCampaign();
  };

  /** Reorder to-do items in the campaign */
  const reorderToDos = async (reorderedToDos: CampaignToDo[]) => {
    if (!currentCampaign.value) return;

    currentCampaign.value.toDoItems = reorderedToDos;
    await currentCampaign.value.save();
    await mainStore.refreshCampaign();
  };

  /** Move an idea to the to-do list */
  const moveIdeaToToDo = async (uuid: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.moveIdeaToToDo(uuid);
    await mainStore.refreshCampaign();
  };

  /** Move a to-do item to the ideas list */
  const moveToDoToIdea = async (uuid: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.moveToDoToIdea(uuid);
    await mainStore.refreshCampaign();
  };

  /** Reorder available (undelivered) lore */
  const reorderAvailableLore = async (reorderedLore: CampaignLoreRow[]) => {
    if (!currentCampaign.value) return;

    currentCampaign.value.lore = reorderedLore.map(l => ({
      uuid: l.uuid,
      delivered: l.delivered,
      description: l.description,
      significant: l.significant,
      lockedToSessionId: null,
      lockedToSessionName: null,
    }));

    await currentCampaign.value.save();
    await mainStore.refreshCampaign();
  };

  ///////////////////////////////
  // internal functions

  // when we click on a session in delivered lore, open the session's lore tab
  async function onSessionClick (event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) {
    const sessionId = rowData.lockedToSessionId as string | null;
    if (!sessionId)
      return;

    await useNavigationStore().openSession(sessionId, { newTab: event.ctrlKey, activate: true, panelIndex: event.altKey ? -1 : undefined });
    await useNavigationStore().updateContentTab('lore');
  }

  // when we click on an entry in the toDo list, open it
  async function onToDoClick (event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) {
    const uuid = rowData.uuid;
    // look up the toDo item from the campaign
    const toDo = currentCampaign.value?.toDoItems.find(t => t.uuid === uuid);

    if (!toDo)
      return;

    // If there's a linked entity, check if it still exists
    if (toDo.linkedUuid) {
      const entry = await Entry.fromUuid(toDo.linkedUuid);
      if (!entry) {
        // I don't think we currently link to documents, but just in case
        const document = await foundry.utils.fromUuid<foundry.abstract.Document<any, any>>(toDo.linkedUuid);
        if (!document) {
          notifyWarn(localize('notifications.toDoReferenceNotFound'));
          return;
        }
      }
    }

    // set the tab if needed
    let tabId = null as string | null;
    switch (toDo?.type) {
      case ToDoTypes.Lore:
        tabId = 'lore';
        break;
      case ToDoTypes.Vignette:
        tabId = 'vignettes';
        break;
      case ToDoTypes.Monster:
        tabId = 'monsters';
        break;
      case ToDoTypes.Item:
        tabId = 'magic';
        break;
    }

    switch (toDo?.type) {
      case ToDoTypes.Entry:
        // just open the entry
        if (toDo.linkedUuid) { // Check if linkedUuid exists before trying to use it
          navigationStore.openEntry(toDo.linkedUuid, { newTab: event.ctrlKey, activate: true, panelIndex: event.altKey ? -1 : undefined });
        }
        break;
      case ToDoTypes.Lore:
      case ToDoTypes.Vignette:
      case ToDoTypes.Monster:
      case ToDoTypes.Item:
        // open the session and set the right tab
        if (toDo.sessionUuid) { // Check if sessionUuid exists
          navigationStore.openSession(toDo.sessionUuid, { newTab: event.ctrlKey, activate: true, contentTabId: tabId || undefined, panelIndex: event.altKey ? -1 : undefined });
        }
        break;
      case ToDoTypes.GeneratedName:
        // do nothing
        break;
    }
  }

  /** Get the last (highest-numbered) session in the campaign, creating one if needed */
  const _getLastSession = async (): Promise<Session | null> => {
    if (!currentCampaign.value || !currentSetting.value)
      return null;

    const sessions = currentCampaign.value.sessionIndex;

    if (sessions.length !== 0) {
      const highestSession = sessions.reduce((session, maxSession) => {
        if (session.number > maxSession.number)
          return session;
        else
          return maxSession;
      }, sessions[0]);
      return await Session.fromUuid(highestSession.uuid);
    }

    // need to create one
    const newSession = await Session.create(currentCampaign.value);
    if (!newSession)
      return null;

    newSession.number = 1;

    await campaignDirectoryStore.refreshCampaignDirectoryTree();

    return newSession;
  };

  ///////////////////////////////
  // Generic grouped table stores
  
  // Multi-group store for all grouped items in the campaign
  const groupStores = createGroupedTableStores({
    currentEntity: currentCampaign,
    refresh: mainStore.refreshCampaign,
    groupConfigs: {
      [GroupableItem.CampaignToDos]: {
        propertyName: 'toDoItems',
      },
      [GroupableItem.CampaignIdeas]: {
        propertyName: 'ideas',
      },
      [GroupableItem.CampaignLore]: {
        propertyName: 'lore',
      },
      [GroupableItem.CampaignPCs]: {
        propertyName: 'pcs',
        // Computed entity for CampaignPCs that falls back to loading campaign from session
        // This is needed because when viewing a session, currentCampaign is null,
        // but PCs are stored on the campaign and need to be editable from the session view
        entityRef: computed(() => {
          if (currentCampaign.value) {
            return currentCampaign.value;
          }
          // When viewing a session, load the campaign from the session
          // Note: This is a synchronous computed, so we can't use async loadCampaign()
          // Instead, we rely on the campaign being cached on the session object
          return currentSession.value?.campaign || null;
        }),
        // Custom refresh function for PC changes that also refreshes sessions viewing the same campaign
        // This ensures that when PCs are modified in one panel, any session panel viewing the same
        // campaign will also be refreshed
        refresh: async () => {
          await mainStore.refreshCampaign();
          
          // Refresh all sessions that belong to the current campaign
          // This ensures that when PCs are modified in the campaign panel, any session panel
          // viewing the same campaign will also be refreshed with the updated PC data
          const campaignId = currentCampaign.value?.uuid || currentSession.value?.campaignId;
          if (campaignId) {
            await navigationStore.refreshSessionsForCampaign(campaignId);
          }
        },
      },
    },
  });

  ///////////////////////////////
  // return the public interface
  return {
    extraFields,
    availableCampaigns,
    addPC,
    deletePC,
    reorderPCs,
    reorderStoryWebs,
    addLore,
    deleteLore,
    reorderAvailableLore,
    updateLoreDescription,
    markLoreDelivered,
    moveLoreToLastSession,
    moveLoreToArc,
    addToDoItem,
    mergeToDoItem,
    completeToDoItem,
    updateToDoItem,

    groupStores,
    addIdea,
    updateIdea,
    deleteIdea,
    reorderIdeas,
    moveIdeaToArc,
    reorderToDos,
    moveIdeaToToDo,
    moveToDoToIdea,
  };
};
