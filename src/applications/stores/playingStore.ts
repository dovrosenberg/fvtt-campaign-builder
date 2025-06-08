// this store handles activities specific to play mode
//
// library imports
import { defineStore, storeToRefs } from 'pinia';
import { watch, ref, computed, } from 'vue';

// local imports
import { useMainStore, useCampaignStore } from '@/applications/stores';

// types
import { Campaign, Entry, Session } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';
import { openSessionNotes, SessionNotesApplication, } from '@/applications/SessionNotes';
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

  
  ///////////////////////////////
  // external state

  ///////////////////////////////
  // actions

  ///////////////////////////////
  // computed state
  const currentPlayedSession = computed((): Session | null => (currentPlayedCampaign?.value?.currentSession || null) as Session | null);
  

  // The currently played campaign object (update it by updating currentPlayedCampaignId)
  // note if we're just leaving isInPlayMode, this will still be the old campaign until everything resolves
  const currentPlayedCampaign = computed((): Campaign | null => {
    // if we're not in play mode and the campaign ID is null don't reset it again
    if (!isInPlayMode.value && !currentPlayedCampaignId.value) {
      return null;
    }

    // If we don't have a setting, can't have a campaign
    if (!currentSetting.value) {
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

    // if we have an old session, we will need to check for to dos
    // campaign might be closed, so pull from the session
    if (oldSession && oldSession.campaign) {
      const oldSessionStartingNotes = initialSessionNotes.value;

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
  
        await oldSession.campaign.mergeToDoItem(ToDoTypes.Entry, `Added to notes in Session ${oldSession.number}`, uuid, oldSession.uuid);
      }

      // we might happen to be looking at campaign todos, so refresh
      await mainStore.refreshCurrentContent();
    }

    // if newSession exists, capture the starting notes and open window if needed
    if (newSession) {
      initialSessionNotes.value = newSession?.notes ?? '';

      // close and reopen window to get the title right
      if (ModuleSettings.get(SettingKey.displaySessionNotes)) {
        await openSessionNotes(newSession);
      }
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
      // When exiting play mode, first close the session notes window (which will save if needed)
      // have to do this first because once the current session changes, reactivity will lose any unsaved edits
      await SessionNotesApplication.close();

      // clear the current played campaign
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
  };
});

