// this store handles activities specific to play mode
//
// library imports
import { defineStore, storeToRefs } from 'pinia';
import { watch, ref, computed, } from 'vue';

// local imports
import { FCBDialog } from '@/dialogs';
import { useMainStore, useCampaignStore } from '@/applications/stores';
import SessionNotes from '@/components/applications/SessionNotes.vue';

// types
import { Campaign, Entry, Session } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';
import { openSessionNotes, } from '@/applications/SessionNotes';
import { localize } from '@/utils/game';
import { ToDoTypes } from '@/types';

// the store definition
export const usePlayingStore = defineStore('playing', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const campaignStore = useCampaignStore();
  const { currentSetting, isInPlayMode } = storeToRefs(mainStore);
  const { availableCampaigns } = storeToRefs(campaignStore);

  ///////////////////////////////
  // internal state
  const currentPlayedCampaignId = ref<string | null>(null);

  /** the notes from when we entered play mode so we can look for new uuids and check for need to save */
  const initialSessionNotes  = ref<string | null>(null);  
  
  // the currently open session notes window
  const openSessionNotesWindow = ref<typeof SessionNotes | null>(null);

  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions

  ///////////////////////////////
  // computed state
  const currentPlayedSession = computed((): Session | null => (currentPlayedCampaign?.value?.currentSession || null) as Session | null);
  

  // The currently played campaign object (update it by updating currentPlayedCampaignId)
  const currentPlayedCampaign = computed((): Campaign | null => {
    // If we're not in play mode or don't have a world, return null
    if (!isInPlayMode.value || !currentSetting.value) {
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

  const playableCampaigns = computed((): Campaign[] => {
    return availableCampaigns.value.filter((c) => c.sessions.length !== 0);
  });


  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // watchers

  // we capture changes to both the played campaign and turning off isInPlayMode here (via campaign going to null)
  // need to do that here vs isInPlayMode watcher because we need the old campaign value to save the session notes
  // basic flow:
  //   - if oldSession is null and new one isn't, we need to just capture the starting notes to check for dirty later
  //   - if newSession is null and old one isn't, we're closing so we need to check for dirty and also for To Dos
  //   - if both are not null, ditto
  watch(() => currentPlayedSession.value, async (newSession: Session | null, oldSession: Session | null) => {
    // make the sure the id changed
    if (oldSession?.uuid === newSession?.uuid)
      return;

    // if oldSession is null, we're turning on play mode, so nothing else to do besides settup up the notes window
    if (!oldSession) {
      if (openSessionNotesWindow.value) {
        openSessionNotesWindow.value.setSession(newSession);
      }
      return;
    }

    // from here, we have an old session, so we need to see about saving it
    const oldSessionStartingNotes = oldSession?.notes ?? '';

    // if newSession is null we're closing, otherwise we're changing campaigns (because there's no way to change 
    //    the played session within a campaign while playing)
    // either way, we need to check if the session notes window is dirty and save if needed
    if (openSessionNotesWindow && openSessionNotesWindow.value.getNotes() !== initialSessionNotes.value) {
      if (await FCBDialog.confirmDialog(localize('dialogs.saveSessionNotes.title'), localize('dialogs.saveSessionNotes.message'))) {
        ui.notifications.warn('saving not done yet');.
        // oldSession.notes = openSessionNotesWindow.value.getNotes();
        // await oldSession.save();

        // refresh the content in case we're looking at the notes page for that session
        await mainStore.refreshCurrentContent();
      }
    }

    // if newSession exists, capture the starting notes
    if (newSession) {
      // now that we've saved (or not), we can update the notes window with the new session
      if (openSessionNotesWindow.value) {
        openSessionNotesWindow.value.setSession(newSession);
      }
      
      initialSessionNotes.value = newSession?.notes ?? '';
    }

     // check for new uuids that should become to do items
    const oldUuids = !oldSessionStartingNotes ? [] : [...oldSessionStartingNotes.matchAll(/@UUID\[([^\]]+)\]/g)].map(m => m[1]);
    const newUuids = !oldSession.notes ? [] : [...oldSession.notes.matchAll(/@UUID\[([^\]]+)\]/g)].map(m => m[1]);

    const addedUuids = newUuids.filter(u => !oldUuids.includes(u));

    for (const uuid of addedUuids) {
      const entry = await Entry.fromUuid(uuid);

      // might be a document instead of an entry
      if (!entry) 
        // just skip it
        continue;

      await campaignStore.mergeToDoItem(ToDoTypes.Entry, `Added to notes in Session ${oldSession.number}`, uuid, oldSession.uuid);
    }


    // if switching campaigns, open new notes
    if (ModuleSettings.get(SettingKey.displaySessionNotes) && newSession) {
      await openSessionNotes(newSession);
      initialSessionNotes.value = newSession.notes;
    }
  });

  // When the world changes, reset the current played campaign
  watch(()=> currentSetting.value, () => {
    currentPlayedCampaignId.value = currentPlayedCampaign.value?.uuid ?? null;
  });
  
  // When play mode changes, update the current played campaign
  watch(()=> isInPlayMode.value, async (newValue) => {
    if (newValue) {
      // When entering play mode, initialize the current played campaign
      currentPlayedCampaignId.value = currentPlayedCampaign.value?.uuid ?? null;

      // If entering play mode, open the session notes window
      const session = currentPlayedCampaign.value?.currentSession;
      if (ModuleSettings.get(SettingKey.displaySessionNotes) && session) {
        await openSessionNotes(session);
      }
    } else {
      // When exiting play mode, clear the current played campaign
      currentPlayedCampaignId.value = null;
    }
  });

  // When the world changes, reset the current played campaign
  watch(()=> currentSetting.value, () => {
    currentPlayedCampaignId.value = currentPlayedCampaign.value?.uuid ?? null;
  });

  ///////////////////////////////
  // lifecycle events 

  ///////////////////////////////
  // return the public interface
  return {
    currentPlayedCampaign,
    currentPlayedSession,
    currentPlayedCampaignId,    
    playableCampaigns,
    openSessionNotesWindow
  };
});

