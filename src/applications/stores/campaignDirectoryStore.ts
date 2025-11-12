// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, ref, watch, nextTick } from 'vue';

// local imports
import { useMainStore, useNavigationStore, usePlayingStore } from '@/applications/stores';
import { DirectoryCampaignNode, Campaign, Session, FCBSetting, Front, DirectoryArcNode, DirectoryFrontFolder, Arc, } from '@/classes';
import { FCBDialog } from '@/dialogs';
import { notifyWarn } from '@/utils/notifications';
import { ModuleSettings, SettingKey } from '@/settings';

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
  const currentCampaignTree = reactive<{value: DirectoryCampaignNode<any>[]}>({value:[]});

  ///////////////////////////////
  // actions
  // expand/contract  the given entry, loading the new item data
  // return the new node
  const toggleWithLoad = async<
    T extends DirectoryCampaignNode<any> | DirectoryArcNode | DirectoryFrontFolder
  >(node: T, expanded: boolean) : Promise<T>=> {
    return await node.toggleWithLoad(expanded) as T;
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

    for (const campaign of Object.values(campaigns)) {
      // if we are using fronts, the first child is the front folder
      let children: string[] = [];
      if (ModuleSettings.get(SettingKey.useFronts)) {
        children.push(campaign.uuid + ':front');  // this is the id for the front folder
      }

      // the rest of the children are arcs
      for (const arc of currentSetting.value.campaignIndex.find((c)=>c.uuid===campaign.uuid)?.arcs || []) {
        children.push(arc.uuid);
      }

      currentCampaignTree.value.push(new DirectoryCampaignNode(
        campaign.uuid,
        campaign.name,  // name
        children.slice(),
        [],
        expandedNodes[campaign.uuid] || false,
        campaign.completed
      ));      
    }
    
    // Sort and add to reactive array
    (currentCampaignTree.value as DirectoryCampaignNode<any>[]).sort((a: DirectoryCampaignNode<any>, b: DirectoryCampaignNode<any>) => a.name.localeCompare(b.name));

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
    if (!currentSetting.value)
      return;
    
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
  
    for (const arc of campaign.arcIndex) {
      await navigationStore.cleanupDeletedEntry(arc.uuid);
    }

    for (const session of campaign.sessionIndex) {
      await navigationStore.cleanupDeletedEntry(session.uuid);
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
    if (isInPlayMode.value && session.uuid === currentPlayedSessionId.value) {
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

  const deleteFront = async (frontId: string): Promise<void> => {
    const front = await Front.fromUuid(frontId);

    if (!front) 
      throw new Error('Bad front in campaignDirectoryStore.deleteFront()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete front?', 'Are you sure you want to delete this front?')))
      return;
  
    await front.delete();

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(frontId);

    await refreshCampaignDirectoryTree();
  };

  /** create a session in campaign. Puts it at the end.
   *  @param campaignId the campaign to create the session 
   */
  const createSession = async (campaignId: string): Promise<Session | null> => {
    if (!currentSetting.value)
      return null;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      throw new Error('Bad campaign in campaignDirectoryStore.createSessionInArc()');

    const session = await Session.create(campaign);

    if (session) {
      // need to force the parent arc to reload (which is always the last one)
      const lastArc = campaign.arcIndex.at(-1);
      await refreshCampaignDirectoryTree([session.uuid, lastArc!.uuid]);
      return session;
    } else {
      return null;
    }
  };

  const createFront = async (campaignId: string): Promise<Front | null> => {
    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      throw new Error('Bad campaign in campaignDirectoryStore.createFront()');

    const front = await Front.create(campaign);

    if (front) {
      await refreshCampaignDirectoryTree();
      return front;
    } else {
      return null;
    }
  };

  /** create an arc in campaign. Puts it at the end.
   *  @param campaignId the campaign to create the arc 
   */
  const createArc = async (campaignId: string): Promise<Arc | null> => {
    if (!currentSetting.value)
      return null;

    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      throw new Error('Bad campaign in campaignDirectoryStore.createArc()');

    const arc = await Arc.create(campaign);

    if (arc) {
      await refreshCampaignDirectoryTree();
      return arc;
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
    deleteFront,
    createSession,
    createArc,
    createFront,
    createCampaign,
    getCampaigns,
  };
});