// this store handles activities specific to campaigns
//
// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { watch, ref, computed } from 'vue';

// local imports
import { useCampaignDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';

// types
import { PCDetails, FieldData, CampaignLoreDetails, TodoItem} from '@/types';
import { Campaign, PC, Session } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';
import { closeSessionNotes, openSessionNotes } from '@/applications/SessionNotes';

export enum CampaignTableTypes {
  None,
  PC,
  Lore,
  Todo,
}

// the store definition
export const useCampaignStore = defineStore('campaign', () => {
  ///////////////////////////////
  // the state

  // used for tables
  const relatedPCRows = ref<PCDetails[]>([]);
  const relatedLoreRows = ref<CampaignLoreDetails[]>([]);
  const todoRows = ref<TodoItem[]>([]);

  const extraFields = {
    [CampaignTableTypes.None]: [],
    [CampaignTableTypes.PC]: [],
    [CampaignTableTypes.Lore]: [
      { field: 'description', style: 'text-align: left', header: 'Description', editable: true },
      { field: 'lockedToSessionName', style: 'text-align: left', header: 'Delivered in', sortable: true, 
        editable: false, onClick: onSessionClick
      },
      { field: 'journalEntryPageName', style: 'text-align: left', header: 'Journal', editable: false, 
        onClick: onJournalClick
      },
    ],
    [CampaignTableTypes.Todo]: [
      { field: 'text', style: 'text-align: left', header: 'To Do Item', sortable: true, editable: true },
    ],
  } as Record<CampaignTableTypes, FieldData>;

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentCampaign, currentContentTab, currentWorld, isInPlayMode } = storeToRefs(mainStore);

  ///////////////////////////////
  // internal state
  const currentPlayedCampaignId = ref<string | null>(null);
  
  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions
  /** add PC to current campaign */
  const addPC = async (): Promise<PC | null> => {
    if (!currentCampaign.value)
      return null;

    const pc = await PC.create(currentCampaign.value);

    await _refreshPCRows();

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

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete PC?', 'Are you sure you want to delete this PC?')))
      return;

    await pc.delete();

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(pcId);

    await _refreshPCRows();
    await mainStore.refreshCampaign();
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
  
      await currentCampaign.value.updateLoreDescription(uuid, description);
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
  
      // confirm
      if (!(await FCBDialog.confirmDialog('Delete Lore?', 'Are you sure you want to delete this lore?')))
        return;

      await currentCampaign.value.deleteLore(uuid);
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

  
  ///////////////////////////////
  // computed state
  const currentPlayedSession = computed((): Session | null => (currentPlayedCampaign?.value?.currentSession || null) as Session | null);
  
  const availableCampaigns = computed((): Campaign[] => {
    if (!currentWorld.value) {
      return [];
    }

    let campaigns = [] as Campaign[];
    for (const campaignId in currentWorld.value.campaigns) {
      campaigns.push(currentWorld.value.campaigns[campaignId]);
    }

    return campaigns;
  });

  const playableCampaigns = computed((): Campaign[] => {
    return availableCampaigns.value.filter((c) => c.sessions.length !== 0);
  });

  // The currently played campaign object (update it by updating currentPlayedCampaignId)
  const currentPlayedCampaign = computed((): Campaign | null => {
    // If we're not in play mode or don't have a world, return null
    if (!isInPlayMode.value || !currentWorld.value) {
      return null;
    }

    // Get all playable campaigns in the current world
    const campaigns = playableCampaigns.value;

    // If there are no campaigns, return null
    if (!campaigns || campaigns.length === 0) {
      return null;
    }

    // If there's only one campaign, use that
    if (campaigns.length === 1) {
      return campaigns[0];
    }

    // If we have a specific campaign ID selected, use that
    if (currentPlayedCampaignId.value) {
      const campaign = campaigns.find((c) => c.uuid===currentPlayedCampaignId.value) || null;

      // it's possible that it's no longer playable, so let's check
      if (campaign) {
        return campaign
      }
    } 

    // got here, so more than one and we don't have a valid one picked already, so select the first one
    currentPlayedCampaignId.value = campaigns[0].uuid;
    return campaigns[0];
  });


  ///////////////////////////////
  // internal functions
  // when we click on a session in the lore, open the session tab
  async function onJournalClick (_event: MouseEvent, uuid: string) {
    // get session Id
    const journalEntryPageId = relatedLoreRows.value.find(r=> r.uuid===uuid)?.journalEntryPageId;
    const journalEntryPage = await fromUuid<JournalEntryPage>(journalEntryPageId);

    if (journalEntryPage)
      journalEntryPage.sheet?.render(true);
  }

  // when we click on a journal in the lore, open it
  function onSessionClick (event: MouseEvent, uuid: string) {
    // get session Id
    const sessionId = relatedLoreRows.value.find(r=> r.uuid===uuid)?.lockedToSessionId;
    useNavigationStore().openSession(sessionId, { newTab: event.ctrlKey, activate: true });
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

  const _refreshRows = async (): Promise<void> => {
    relatedPCRows.value = [];
    relatedLoreRows.value = [];
    todoRows.value = [];

    if (!currentCampaign.value)
      return;

    await _refreshPCRows();
    await _refreshLoreRows();
    await _refreshTodoRows();
  }

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

  const _refreshLoreRows = async () => {
    if (!currentCampaign.value)
      return;

    const retval = [] as CampaignLoreDetails[];

    // at the top of the list, put all the ones from the sessions... 
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

    for (const lore of currentCampaign.value?.lore) {
      let entry: JournalEntryPage | null = null;

      if (lore.journalEntryPageId)
        entry = await fromUuid<JournalEntryPage>(lore.journalEntryPageId);

      retval.push({
        uuid: lore.uuid,
        lockedToSessionId: null,
        lockedToSessionName: null,
        delivered: lore.delivered,
        description: lore.description,
        journalEntryPageId: lore.journalEntryPageId,
        journalEntryPageName: entry?.name || null,
        packId: entry?.pack ??null,
      });
    }

    relatedLoreRows.value = retval;
  }

  const _refreshTodoRows = async () => {
    if (!currentCampaign.value)
      return;

    const retval = [] as TodoItem[];

    for (const item of currentCampaign.value?.todoItems) {
      retval.push({
        uuid: item.uuid,
        linkedUuid: item.linkedUuid,
        text: item.text,
        type: item.type,
      });
    }

    todoRows.value = retval;
  }


  ///////////////////////////////
  // watchers
  watch(()=> currentCampaign.value, async () => {
    await _refreshRows();
  });

  watch(()=> currentContentTab.value, async () => {
    await _refreshRows();
  });

  // we capture changes to both the played campaign and turning off isInPlayMode here (via campaign going to null)
  // need to do that here vs isInPlayMode watcher because we need the old campaign value to save the session notes
  watch(() => currentPlayedSession.value, async (newSession: Session | null, oldSession: Session | null) => {
    // if oldSession is null, we're turning on play mode, so no issue
    if (!oldSession)
      return;

    // if newSession is null we're closing, otherwise we're changing campaigns (because there's no way to change 
    //    the played session within a campaign while playing)

    // close the notes
    const notesToSave = await closeSessionNotes();

    if (notesToSave != null && oldSession?.notes !== notesToSave) {
      if (await FCBDialog.confirmDialog('Save changes?', 'Do you want to save the current session notes before closing?')) {
        // save the session
        oldSession.notes = notesToSave;
        await oldSession?.save();    

        // refresh the content in case we're looking at the notes page for that session
        await mainStore.refreshCurrentContent();
      }
    }      

    // if switching campaigns, open new notes
    if (ModuleSettings.get(SettingKey.displaySessionNotes) && newSession) {
      await openSessionNotes(newSession);
    }
  });

  // When play mode changes, update the current played campaign
  watch(()=> isInPlayMode.value, async (newValue) => {
    if (newValue) {
      // When entering play mode, initialize the current played campaign
      currentPlayedCampaignId.value = currentPlayedCampaign.value?.uuid ?? null;

      // If entering play mode, open the session notes window
      if (ModuleSettings.get(SettingKey.displaySessionNotes) && currentPlayedCampaign.value?.currentSession) {
        await openSessionNotes(currentPlayedCampaign.value.currentSession);
      }
    } else {
      // When exiting play mode, clear the current played campaign
      currentPlayedCampaignId.value = null;
    }
  });

  // When the world changes, reset the current played campaign
  watch(()=> currentWorld.value, () => {
    currentPlayedCampaignId.value = currentPlayedCampaign.value?.uuid ?? null;
  });

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    relatedPCRows,
    relatedLoreRows,
    extraFields,
    availableCampaigns,
    playableCampaigns,
    currentPlayedCampaign,
    currentPlayedSession,
    currentPlayedCampaignId,

    addPC,
    deletePC,
    addLore,
    deleteLore,
    updateLoreDescription,
    updateLoreJournalEntry,
    markLoreDelivered,
    moveLoreToLastSession,
  };
});

