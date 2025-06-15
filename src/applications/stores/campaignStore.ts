// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, computed } from 'vue';

// local imports
import { useCampaignDirectoryStore, useMainStore, useNavigationStore, useSessionStore } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';

// types
import { PCDetails, FieldData, CampaignLoreDetails, ToDoItem, ToDoTypes, Idea} from '@/types';
import { Campaign, Entry, PC, Session } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';
import { localize } from '@/utils/game';
import Document from 'node_modules/@types/fvtt-types/src/foundry/common/abstract/document.mjs';

export enum CampaignTableTypes {
  None,
  PC,
  Lore,
  DeliveredLore,
  ToDo,
  Idea,
}

// the store definition
export const useCampaignStore = defineStore('campaign', () => {
  ///////////////////////////////
  // the state

  // used for tables
  const relatedPCRows = ref<PCDetails[]>([]);
  const allRelatedLoreRows = ref<CampaignLoreDetails[]>([]);  // all the rows - for lookups
  const toDoRows = ref<ToDoItem[]>([]);
  const ideaRows = ref<Idea[]>([]);

  const extraFields = {
    [CampaignTableTypes.None]: [],
    [CampaignTableTypes.PC]: [],
    [CampaignTableTypes.Lore]: [
      { field: 'description', style: 'text-align: left; width: 80%', header: 'Description', editable: true },
      { field: 'journalEntryPageName', style: 'text-align: left; width: 20%', header: 'Journal', editable: false, 
        onClick: onJournalClick
      },
    ],
    [CampaignTableTypes.DeliveredLore]: [
      { field: 'description', style: 'text-align: left; width: 50%', header: 'Description', editable: true },
      { field: 'lockedToSessionName', style: 'text-align: left; width: 30%', header: 'Delivered in', sortable: true, 
        editable: false, onClick: onSessionClick
      },
      { field: 'journalEntryPageName', style: 'text-align: left; width: 20%', header: 'Journal', editable: false, 
        onClick: onJournalClick
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
  } as Record<CampaignTableTypes, FieldData>;

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentCampaign, currentSession, currentContentTab, currentSetting, } = storeToRefs(mainStore);
  
  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  /** add PC to current campaign */
  const addPC = async (): Promise<PC | null> => {
    const campaign = currentCampaign.value || await currentSession.value?.loadCampaign();

    if (!campaign)
      return null;

    const pc = await PC.create(campaign);

    await _refreshPCRows();

    if (pc) {
      await mainStore.refreshCurrentContent();
      return pc;
    } else { 
      return null;
    }
  };

  const deletePC = async (pcId: string): Promise<void> => {
    const campaign = currentCampaign.value || await currentSession.value?.loadCampaign();
    
    if (!campaign)
      return;

    const pc = await PC.fromUuid(pcId);

    if (!pc) 
      throw new Error('Bad session in campaignDirectoryStore.deletePC()');

    // confirm
    if (!(await FCBDialog.confirmDialog(localize('dialogs.confirmDeletePC.title'), localize('dialogs.confirmDeletePC.message'))))
      return;

    await pc.delete();

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(pcId);

    await _refreshPCRows();

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
      await _refreshLoreRows();
      return loreUuid;
    }
  
    /**
     * Updates the description associated with a lore 
     * @param uuid the UUID of the lore
     */
    const updateLoreDescription = async (uuid: string, description: string): Promise<void> => {
      if (!currentCampaign.value)
        throw new Error('Invalid session in campaignStore.updateLoreDescription()');
  
      // first look it up in the rows to see if it's campaign or session
      const row = allRelatedLoreRows.value.find(r=> r.uuid===uuid);

      if (!row)
        throw new Error('Lore not found in campaignStore.updateLoreDescription()');

      if (row.lockedToSessionId) {
        // it's a session one, so we need to update it in the session
        const session = await Session.fromUuid(row.lockedToSessionId);
        if (!session)
          throw new Error('Session not found in campaignStore.updateLoreDescription()');
        
        await session.updateLoreDescription(uuid, description);
      } else {
        await currentCampaign.value.updateLoreDescription(uuid, description);
      }

      await _refreshLoreRows();
    }
    
    /**
     * Updates the journal entry associated with a lore 
     * @param loreUuid the UUID of the lore
     * @param journalEntryPageUuid the UUID of the journal entry page (or null)
     */
    const updateLoreJournalEntry = async (loreUuid: string, journalEntryPageUuid: string | null): Promise<void> => {
      if (!currentCampaign.value)
        throw new Error('Invalid session in campaignStore.updateLoreJournalEntry()');
  
      await currentCampaign.value.updateLoreJournalEntry(loreUuid, journalEntryPageUuid);
      await _refreshLoreRows();
    }
  
    /**
     * Deletes a lore from the session
     * @param uuid the UUID of the lore
     */
    const deleteLore = async (uuid: string): Promise<void> => {
      if (!currentCampaign.value)
        throw new Error('Invalid session in campaignStore.deleteLore()');
  
      // first look it up in the rows to see if it's campaign or session
      const row = allRelatedLoreRows.value.find(r=> r.uuid===uuid);

      if (!row)
        throw new Error('Lore not found in campaignStore.deleteLore()');

      // confirm
      if (!(await FCBDialog.confirmDialog('Delete Lore?', 'Are you sure you want to delete this lore?')))
        return;

      if (row.lockedToSessionId) {
        // it's a session one, so we need to delete it from the session
        const session = await Session.fromUuid(row.lockedToSessionId);
        if (!session)
          throw new Error('Session not found in campaignStore.deleteLore()');
        
        await session.deleteLore(uuid);
      } else { 
        await currentCampaign.value.deleteLore(uuid);
      }

      await _refreshLoreRows();
    }
  
    /**
     * Set the delivered status for a given lore.
     * @param uuid the UUID of the lore
     * @param delivered the new delivered status
     */
    const markLoreDelivered = async (uuid: string, delivered: boolean): Promise<void> => {
      if (!currentCampaign.value)
        throw new Error('Invalid session in campaignStore.markLoreDelivered()');
  
      await currentCampaign.value.markLoreDelivered(uuid, delivered);
      await _refreshLoreRows();
    }
  
    /**
     * Move a lore to the last session in the campaign, creating if needed
     * @param uuid the UUID of the lore to move
     */
    const moveLoreToLastSession = async (uuid: string): Promise<void> => {
      if (!currentCampaign.value)
        return;
  
      const lastSession = await _getLastSession();
  
      if (!lastSession) 
        return;
  
      const currentLore = currentCampaign.value.lore.find(l=> l.uuid===uuid);
  
      if (!currentLore)
        return;
  
      // have a next session - add there and delete here
      await lastSession.addLore(currentLore.description);
      await currentCampaign.value.deleteLore(uuid);
  
      await _refreshLoreRows();
    }

  const addToDoItem = async (type: ToDoTypes, text: string, linkedUuid?: string, sessionUuid?: string): Promise<ToDoItem | null> => {
    if (!currentCampaign.value)
      return null;

    const newItem = await currentCampaign.value.addNewToDoItem(type, text, linkedUuid, sessionUuid);
    await _refreshToDoRows();
    return newItem;
  }
  
  const mergeToDoItem = async (type: ToDoTypes, text: string, linkedUuid?: string, sessionUuid?: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.mergeToDoItem(type, text, linkedUuid, sessionUuid);
    await _refreshToDoRows();
  }

  const updateToDoItem = async (uuid: string, newDescription: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.updateToDoItem(uuid, newDescription);
    await _refreshToDoRows();
  }

  const completeToDoItem = async (uuid: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.completeToDoItem(uuid);
    await _refreshToDoRows();
  }

   /**
   * Adds a lore to the campaign.
   * @param description The description for the idea
   * @returns The UUID of the created idea
   */
  const addIdea = async (description = ''): Promise<string | null> => {
    if (!currentCampaign.value)
      throw new Error('Invalid campaign in campaignStore.addIdea()');

    const ideaUuid = await currentCampaign.value.addIdea(description);
    await _refreshIdeaRows();
    return ideaUuid;
  }

  const updateIdea = async (uuid: string, newText: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    await currentCampaign.value.updateIdea(uuid, newText);
    await _refreshIdeaRows();
  }

  const deleteIdea = async (uuid: string): Promise<void> => {
    if (!currentCampaign.value)
      return;

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete Idea?', 'Are you sure you want to delete this idea?')))
      return;

    await currentCampaign.value.deleteIdea(uuid);
    await _refreshIdeaRows();
  }

  ///////////////////////////////
  // computed state
  const deliveredLoreRows = computed((): CampaignLoreDetails[] => {
    return allRelatedLoreRows.value.filter((r) => r.delivered);
  });

  const availableLoreRows = computed((): CampaignLoreDetails[] => {
    return allRelatedLoreRows.value.filter((r) => !r.delivered);
  });

    const availableCampaigns = computed((): Campaign[] => {
    if (!currentSetting.value) {
      return [];
    }

    let campaigns = [] as Campaign[];
    for (const campaignId in currentSetting.value.campaigns) {
      campaigns.push(currentSetting.value.campaigns[campaignId]);
    }

    return campaigns;
  });


  ///////////////////////////////
  // internal functions
  // when we click on a session in the lore, open the session tab
  async function onJournalClick (_event: MouseEvent, uuid: string) {
    // get session Id
    const journalEntryPageId = allRelatedLoreRows.value.find(r=> r.uuid===uuid)?.journalEntryPageId;
    const journalEntryPage = await fromUuid<JournalEntryPage>(journalEntryPageId);

    if (journalEntryPage)
      journalEntryPage.sheet?.render(true);
  }

  // when we click on a journal in the lore, open it
  async function onSessionClick (event: MouseEvent, uuid: string) {
    // get session Id
    const sessionId = allRelatedLoreRows.value.find(r=> r.uuid===uuid)?.lockedToSessionId;

    if (!sessionId)
      throw new Error('Session not found in campaignStore.onSessionClick()');

    await useNavigationStore().openSession(sessionId, { newTab: event.ctrlKey, activate: true });

    // set the tab to the lore
    await useNavigationStore().updateContentTab('lore');
  }

  // when we click on an entry in the todo list, open it
  async function onToDoClick (event: MouseEvent, uuid: string) {
    const toDo = toDoRows.value.find(r=> r.uuid===uuid);

    if (!toDo) 
      return;

    // If there's a linked entity, check if it still exists
    if (toDo.linkedUuid) {
      const entry = await Entry.fromUuid(toDo.linkedUuid);
      if (entry) 
        return;

      const document = await fromUuid<Document<any, any>>(toDo.linkedUuid);
      if (!document) {
        ui.notifications.warn(localize('notifications.todoReferenceNotFound'));
        return;
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
          navigationStore.openEntry(toDo.linkedUuid, { newTab: event.ctrlKey, activate: true });
        }
        break;
      case ToDoTypes.Lore:
      case ToDoTypes.Vignette:
      case ToDoTypes.Monster:
      case ToDoTypes.Item:
        // open the session and set the right tab
        if (toDo.sessionUuid) { // Check if sessionUuid exists
          navigationStore.openSession(toDo.sessionUuid, { newTab: event.ctrlKey, activate: true, contentTabId: tabId || undefined });
        }
        break;
      case ToDoTypes.GeneratedName:
        // do nothing
        break;
    }
  }

  const _getLastSession = async (): Promise<Session | null> => {
    if (!currentCampaign.value)
      return null;

    const sessions = currentCampaign.value.sessions; 

    if (sessions.length!==0) {
      return sessions.reduce((session, maxSession) => {
        if (session.number > maxSession.number)
          return session;
        else
          return maxSession;
      }, sessions[0]);
    } 
    
    // need to create one
    const newSession = await Session.create(currentCampaign.value);
    if (!newSession)
      return null;

    newSession.number = 1;

    await campaignDirectoryStore.refreshCampaignDirectoryTree();

    return newSession;
  }

  const _refreshPCRows = async (): Promise<void> => {
    relatedPCRows.value = [];

    const campaign = currentCampaign.value || await currentSession.value?.loadCampaign();
    
    if (!campaign) 
      return;
    
    const pcs = await campaign.getPCs();

    // we can't just do it in place because of a race condition
    const retval = [] as PCDetails[];

    if (pcs) {
      for (let i = 0; i < pcs.length; i++) {
        retval.push({ 
          name: pcs[i].name,
          playerName: pcs[i].playerName,
          uuid: pcs[i].uuid,
        });
      }
    }

    relatedPCRows.value = retval;
  };

  const _refreshLoreRows = async () => {
    allRelatedLoreRows.value = [];
    
    if (!currentCampaign.value)
      return;

    const retval = [] as CampaignLoreDetails[];

    // go through everything in the sessions that was delivered
    for (const session of currentCampaign.value.sessions) {
      for (const lore of session.lore) {
        if (!lore.delivered)
          continue;
        
        let entry: JournalEntryPage | null = null;

        if (lore.journalEntryPageId)
          entry = await fromUuid<JournalEntryPage>(lore.journalEntryPageId);
  
        retval.push({
          uuid: lore.uuid,
          lockedToSessionId: session.uuid,
          lockedToSessionName: `${session.number}- ${session.name}`,
          delivered: lore.delivered,
          description: lore.description,
          journalEntryPageId: lore.journalEntryPageId,
          journalEntryPageName: entry?.name || null,
          packId: entry?.pack ?? null,
        });
      }
    }

    // now get the ones at the campaign level - delivered or not
    for (const lore of currentCampaign.value?.lore) {
      let entry: JournalEntryPage | null = null;

      if (lore.journalEntryPageId)
        entry = await fromUuid<JournalEntryPage>(lore.journalEntryPageId);

      retval.push({
        uuid: lore.uuid,
        lockedToSessionId: null,
        lockedToSessionName: 'Campaign',
        delivered: lore.delivered,
        description: lore.description,
        journalEntryPageId: lore.journalEntryPageId,
        journalEntryPageName: entry?.name || null,
        packId: entry?.pack ??null,
      });
    }

    allRelatedLoreRows.value = retval;
  }

  const _refreshToDoRows = async () => {
    toDoRows.value = [];

    if (!currentCampaign.value)
      return;
    
    toDoRows.value = Array.from(currentCampaign.value.todoItems);
  }

  const _refreshIdeaRows = async () => {
    ideaRows.value = [];

    if (!currentCampaign.value)
      return;
    
    ideaRows.value = Array.from(currentCampaign.value.ideas);
  }

  const _refreshRowsForTab = async () => {
    switch (currentContentTab.value) {
      case 'pcs':
        await _refreshPCRows();
        break;
      case 'lore':
        await _refreshLoreRows();
        break;
      case 'ideas':
        await _refreshIdeaRows();
        break;
      case 'todo':
        await _refreshToDoRows();
        break;
      case 'start':
        break;
      default:
    }
  }


  ///////////////////////////////
  // watchers
  watch(()=> currentCampaign.value, async () => {
    await _refreshRowsForTab();
  });

  // have to watch the session because they share PCs
  watch(()=> currentSession.value, async () => {
    if (currentContentTab.value === 'pcs')
      await _refreshPCRows();
  });

  watch(()=> currentContentTab.value, async () => {
    await _refreshRowsForTab();
  });

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    relatedPCRows,
    deliveredLoreRows,
    availableLoreRows,
    extraFields,
    availableCampaigns,
    toDoRows,
    ideaRows,
    
    addPC,
    deletePC,
    addLore,
    deleteLore,
    updateLoreDescription,
    updateLoreJournalEntry,
    markLoreDelivered,
    moveLoreToLastSession,
    addToDoItem,
    mergeToDoItem,
    completeToDoItem,
    updateToDoItem,
    addIdea,
    updateIdea,
    deleteIdea,
  };
});

