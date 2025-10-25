// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, ref, watch, nextTick } from 'vue';

// local imports
import { useMainStore, useNavigationStore, usePlayingStore } from '@/applications/stores';
import { DirectoryCampaignNode, Campaign, Session, FCBSetting, } from '@/classes';
import { FCBDialog } from '@/dialogs';
import { notifyWarn } from '@/utils/notifications';

// types

// the store definition
export const useCampaignDirectoryStore = defineStore('campaignDirectory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const playingStore = usePlayingStore();
  const { currentSetting, currentEntry, isInPlayMode } = storeToRefs(mainStore); 
  const { currentPlayedSessionId } = storeToRefs(playingStore);

  ///////////////////////////////
  // internal state
  const isCampaignTreeRefreshing = ref<boolean>(false);

  ///////////////////////////////
  // external state
  
  // the top-level folder structure
  const currentCampaignTree = reactive<{value: DirectoryCampaignNode[]}>({value:[]});

  ///////////////////////////////
  // actions
  // expand/contract  the given entry, loading the new item data
  // return the new node
  const toggleWithLoad = async(node: DirectoryCampaignNode, expanded: boolean) : Promise<DirectoryCampaignNode>=> {
    return await node.toggleWithLoad(expanded);
  };

  // refreshes the campaign tree 
  const refreshCampaignDirectoryTree = async (updateIds: string[] = []): Promise<void> => {
    // Prevent concurrent refreshes
    if (isCampaignTreeRefreshing.value) {
      return;
    }

    // need to have a current setting and journals loaded
    if (!currentSetting.value)
      return;

    isCampaignTreeRefreshing.value = true;

    // Preserve scroll position before refresh
    let scrollContainer: HTMLElement | null = document.querySelector('.fcb-campaign-directory') as HTMLElement;
    const originalScrollTop = scrollContainer?.scrollTop || 0;

    const expandedNodes = currentSetting.value.expandedIds || {};

    currentCampaignTree.value = [];
    
    // get all the campaigns - we could just use campaignNames but this will clean up any bad ones (i.e. got deleted incompletely)
    await currentSetting.value.loadCampaigns();
    const campaigns = currentSetting.value.campaigns;

    for (const id in campaigns) {
      const campaign = await Campaign.fromUuid(id);

      // shouldn't happen but maybe something didn't get cleaned up; we'll clean it up in FCBSetting.loadCampaigns() at some point
      if (!campaign) {
        continue;
      }

      const children = campaign.sessionIds || [];

      currentCampaignTree.value.push(new DirectoryCampaignNode(
        id,
        campaigns[id].name,  // name
        children,
        [],
        expandedNodes[id] || false,
      ));      
    }
    
    // Sort and add to reactive array
    (currentCampaignTree.value as DirectoryCampaignNode[]).sort((a: DirectoryCampaignNode, b: DirectoryCampaignNode) => a.name.localeCompare(b.name));

    // load any open campaigns
    for (let i=0; i<currentCampaignTree.value.length; i++) {
      const campaignNode = currentCampaignTree.value[i];

      if (!campaignNode.expanded)
        continue;

      // have to check all children are loaded and expanded properly
      await campaignNode.recursivelyLoadNode(expandedNodes, updateIds);
    } 

    // refresh the entry - this will update the push to session button
    if (currentEntry.value)
      await mainStore.refreshEntry();

    isCampaignTreeRefreshing.value = false;

    // Wait for next tick to ensure DOM is updated
    await nextTick();

    // Perform scroll restoration once after DOM updates
    // We get the container again because it was unmounted and remounted
    scrollContainer = document.querySelector<HTMLElement>('.fcb-setting-directory');
    if (scrollContainer && originalScrollTop) {
      scrollContainer.scrollTop = originalScrollTop;
    }
  };

  const deleteCampaign = async(campaignId: string): Promise<void> => {
    // have to delete all the sessions, too - not from the database (since deleting campaign
    //    will do that), but from the UI
    const campaign = await Campaign.fromUuid(campaignId);

    if (!campaign) 
      throw new Error('Bad campaign in campaignDirectoryStore.deleteCampaign()');

    // don't allow when in play mode
    if (isInPlayMode.value) {
      notifyWarn('Cannot delete campaigns when in play mode');
      return;
    }
    
    // confirm
    if (!(await FCBDialog.confirmDialog('Delete campaign?', 'Are you sure you want to delete this campaign?')))
      return;
  
    const sessions = await campaign.allSessions();
    for (let i=0; i<sessions.length; i++) {
      await navigationStore.cleanupDeletedEntry(sessions[i].uuid);
    }

    await campaign.delete();

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(campaignId);

    await refreshCampaignDirectoryTree();
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    const session = await Session.fromUuid(sessionId);

    if (!session) 
      throw new Error('Bad session in campaignDirectoryStore.deleteSession()');

    // do not delete the current session when in play mode
    // This shouldn't be possible because the only place you can do this is from the context menu
    //    and the option should be disabled when isInPlayMode, but some people have
    //    reported it happening.
    if (isInPlayMode.value && session.uuid === currentPlayedSessionId) {
      notifyWarn('You cannot delete the current session while in Play mode.');
      return;
    }
    
    // confirm
    if (!(await FCBDialog.confirmDialog('Delete session?', 'Are you sure you want to delete this session?')))
      return;
  
    await session.delete();

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(sessionId);

    await refreshCampaignDirectoryTree();
  };

  const createSession = async (campaignId: string): Promise<Session | null> => {
    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      throw new Error('Bad campaign in campaignDirectoryStore.createSession()');

    const session = await Session.create(campaign);

    if (session) {
      await refreshCampaignDirectoryTree();
      return session;
    } else {
      return null;
    }
  };

  /**
   * Creates a new campaign in the current setting and opens it
   * @param setting The setting to create the campaign in; defaults to the current setting if there is one
   * @returns The created campaign, or null if the setting is not found
   */
  const createCampaign = async (setting?: FCBSetting): Promise<Campaign | null> => {
    let campaign: Campaign | null = null;

    let settingToUse: FCBSetting | null;
    
    if (!setting || setting.uuid === currentSetting.value?.uuid)
      settingToUse = currentSetting.value;
    else
      settingToUse = setting;

    if (!settingToUse)
      throw new Error('No setting in campaignDirectoryStore.createCampaign()');

    campaign = await Campaign.create(settingToUse);

    if (campaign) {
      // if we're working on the current setting, refresh the tree and open the campaign
      if (settingToUse.uuid === currentSetting.value?.uuid) {
        await refreshCampaignDirectoryTree();
        await navigationStore.openCampaign(campaign.uuid, {newTab: true});
      }
    }

    return campaign;
  };

  /**
   * Gets all campaigns in the current setting
   * @returns Array of Campaign objects
   */
  const getCampaigns = async (): Promise<Campaign[]> => {
    if (!currentSetting.value) {
      return [];
    }

    await currentSetting.value.loadCampaigns();
    let campaignList = [] as Campaign[];
    for (const campaignId in currentSetting.value.campaigns) {
      campaignList.push(currentSetting.value.campaigns[campaignId]);
    }

    // Sort alphabetically by name
    campaignList.sort((a, b) => a.name.localeCompare(b.name));

    return campaignList;
  };


  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  
  ///////////////////////////////
  // watchers

  // when the setting changes, clean out the cache of loaded items
  watch(currentSetting, async (newSetting: FCBSetting | null): Promise<void> => {
    if (!newSetting) {
      currentCampaignTree.value = [];
      return;
    }

    await refreshCampaignDirectoryTree();
  });
  
  
  ///////////////////////////////
  // lifecycle events
  
  ///////////////////////////////
  // return the public interface
  return {
    currentCampaignTree,
    isCampaignTreeRefreshing,

    toggleWithLoad,
    refreshCampaignDirectoryTree,
    deleteCampaign,
    deleteSession,
    createSession,
    createCampaign,
    getCampaigns,
  };
});