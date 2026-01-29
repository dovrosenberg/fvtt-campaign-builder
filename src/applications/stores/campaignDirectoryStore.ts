// this store handles the directory tree

// library imports
import { storeToRefs, } from 'pinia';
import { reactive, ref, watch, nextTick } from 'vue';

// local imports
import { useMainStore, useNavigationStore, usePlayingStore } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';
import { DirectoryCampaignNode, DirectoryArcNode, DirectoryFrontFolder, Campaign, Session, Front, Arc, FCBSetting, StoryWeb } from '@/classes';
import ArcIndexService from '@/utils/arcIndex';
import { ModuleSettings, SettingKey } from '@/settings';
import { notifyWarn } from '@/utils/notifications';

// types

// the store definition
export const campaignDirectoryStore = () => {
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
    const retval = await node.toggleWithLoad(expanded) as T;
    await refreshCampaignDirectoryTree();
    return retval;
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

    // wrap in a try to ensure we don't get stuck in a refresh loop
    try {
      // Preserve scroll position before refresh
      let scrollContainer: HTMLElement | null = document.querySelector('.fcb-campaign-directory') as HTMLElement;
      const originalScrollTop = scrollContainer?.scrollTop || 0;

      const expandedNodes = currentSetting.value.expandedIds || {};

      currentCampaignTree.value = [];
      
      // get all the campaigns - we could just use campaignNames but this will clean up any bad ones (i.e. got deleted incompletely)
      await currentSetting.value.loadCampaigns();
      const campaigns = currentSetting.value.campaigns || {};

      for (const campaign of Object.values(campaigns)) {
        // if we are using fronts, the first child is the front folder
        let children: string[] = [];
        if (ModuleSettings.get(SettingKey.useFronts)) {
          children.push(campaign.uuid + ':front');  // this is the id for the front folder
        }

        // if we are using webs, add the story web folder
        if (ModuleSettings.get(SettingKey.useWebs)) {
          children.push(campaign.uuid + ':storywebs');  // this is the id for the story web folder
        }

        // the rest of the children are arcs
        const campaignIndexArcs = currentSetting.value.campaignIndex.find((c)=>c.uuid===campaign.uuid)?.arcs || [];
        
        for (const arc of campaignIndexArcs) {
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

      // Keep the derived session bookmarks (in the header) in sync with campaign/session changes.
      await navigationStore.refreshSessionBookmarks();

      isCampaignTreeRefreshing.value = false;

      // Wait for next tick to ensure DOM is updated
      await nextTick();

      // Perform scroll restoration once after DOM updates
      // We get the container again because it was unmounted and remounted
      scrollContainer = document.querySelector<HTMLElement>('.fcb-setting-directory');
      if (scrollContainer && originalScrollTop) {
        scrollContainer.scrollTop = originalScrollTop;
      }
    } catch (error) {
      isCampaignTreeRefreshing.value = false;
      throw error;
    }
  };

  /**
   * Deletes a campaign from the setting and handles all cleanup.
   * 
   * @param campaignId the UUID of the campaign to delete
   * @param external if true, the campaign is being deleted from outside the app (e.g. Foundry); does cleanup but not doc delete
   * 
   * @returns false if delete was cancelled, true otherwise
   */
  const deleteCampaign = async(campaignId: string, external = false): Promise<boolean> => {
    if (!currentSetting.value)
      return false;
    
    // have to delete all the sessions, too - not from the database (since deleting campaign
    //    will do that), but from the UI
    const campaign = await Campaign.fromUuid(campaignId);

    if (!campaign) 
      throw new Error('Bad campaign in campaignDirectoryStore.deleteCampaign()');

    // don't allow when in play mode
    if (isInPlayMode.value) {
      notifyWarn('Cannot delete campaigns when in play mode');
      return false;
    }
    
    // confirm
    if (!external && !(await FCBDialog.confirmDialog('Delete campaign?', 'Are you sure you want to delete this campaign?')))
      return false;
  
    for (const arc of campaign.arcIndex) {
      await navigationStore.cleanupDeletedEntry(arc.uuid);
    }

    for (const session of campaign.sessionIndex) {
      await navigationStore.cleanupDeletedEntry(session.uuid);
    }
    await campaign.delete(external);

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(campaignId);

    await refreshCampaignDirectoryTree();

    return true;
  };

  /**
   * Deletes a session from the campaign and handles all cleanup.
   * 
   * @param sessionId the UUID of the session to delete
   * @param external if true, the session is being deleted from outside the app (e.g. Foundry); does cleanup but not doc delete
   * 
   * @returns false if delete was cancelled, true otherwise
   */
  const deleteSession = async (sessionId: string, external = false): Promise<boolean> => {
    const session = await Session.fromUuid(sessionId);

    if (!session) 
      throw new Error('Bad session in campaignDirectoryStore.deleteSession()');

    // do not delete the current session when in play mode
    // This shouldn't be possible because the only place you can do this is from the context menu
    //    and the option should be disabled when isInPlayMode, but some people have
    //    reported it happening.
    if (isInPlayMode.value && session.uuid === currentPlayedSessionId.value) {
      notifyWarn('You cannot delete the current session while in Play mode.');
      return false;
    }
    
    // confirm
    if (!external && !(await FCBDialog.confirmDialog('Delete session?', 'Are you sure you want to delete this session?')))
      return false;
  
    // Find the affected arc before deleting
    const campaign = await Campaign.fromUuid(session.campaignId);
    if (!campaign)
      throw new Error('Campaign not found in campaignDirectoryStore.deleteSession()');
    
    const affectedArc = ArcIndexService.getArcForSession(campaign.arcIndex, session.number);
    const affectedArcUuid = affectedArc?.uuid || null;
    
    await session.delete(external);  // this will remove from the campaign, etc.

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(sessionId);

    // Refresh tree with the specific arc that was affected
    await refreshCampaignDirectoryTree(affectedArcUuid ? [affectedArcUuid] : []);
 
    return true;
  };

  /**
   * Deletes a front from the campaign and handles all cleanup.
   * 
   * @param frontId the UUID of the front to delete
   * @param external if true, the front is being deleted from outside the app (e.g. Foundry); does cleanup but not doc delete
   * 
   * @returns false if delete was cancelled, true otherwise
   */
  const deleteFront = async (frontId: string, external = false): Promise<boolean> => {
    const front = await Front.fromUuid(frontId);

    if (!front) 
      throw new Error('Bad front in campaignDirectoryStore.deleteFront()');

    // confirm
    if (!external && !(await FCBDialog.confirmDialog('Delete front?', 'Are you sure you want to delete this front?')))
      return false;
  
    await front.delete(external);

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(frontId);

    await refreshCampaignDirectoryTree();

    return true;
  };

  /**
   * Deletes a story web from the campaign and handles all cleanup.
   * 
   * @param storyWebId the UUID of the story web to delete
   * @param external if true, the story web is being deleted from outside the app (e.g. Foundry); does cleanup but not doc delete
   * 
   * @returns false if delete was cancelled, true otherwise
   */
  const deleteStoryWeb = async (storyWebId: string, external = false): Promise<boolean> => {
    const storyWeb = await StoryWeb.fromUuid(storyWebId);

    if (!storyWeb) 
      throw new Error('Bad story web in campaignDirectoryStore.deleteStoryWeb()');

    // confirm
    if (!external && !(await FCBDialog.confirmDialog('Delete story web?', 'Are you sure you want to delete this story web?')))
      return false;
  
    await storyWeb.delete(external);

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(storyWebId);

    await refreshCampaignDirectoryTree();

    return true;
  };

  /**
   * Duplicates a story web in the same campaign
   * 
   * @param storyWebId the UUID of the story web to duplicate
   * 
   * @returns the new duplicated story web or null if cancelled
   */
  const duplicateStoryWeb = async (storyWebId: string): Promise<StoryWeb | null> => {
    const newStoryWeb = await StoryWeb.duplicate(storyWebId);

    if (!newStoryWeb)
      return null;

    await refreshCampaignDirectoryTree();

    return newStoryWeb;
  };

  /** create a session in campaign. Puts it at the end.
   *  @param campaignId the campaign to create the session 
   */
  const createSession = async (campaignId: string): Promise<Session | null> => {
    if (!currentSetting.value)
      return null;

    let campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      throw new Error('Bad campaign in campaignDirectoryStore.createSessionInArc()');

    const session = await Session.create(campaign);

    if (session) {
      // it might have updated the campaign, so make sure we have the latest copy
      campaign = session.campaign!;

      // Find the arc that contains the new session and refresh it
      const affectedArc = ArcIndexService.getArcForSession(campaign.arcIndex, session.number);

      // Always refresh so reactive dependents (like session bookmarks) update reliably.
      await refreshCampaignDirectoryTree(affectedArc?.uuid ? [affectedArc.uuid] : []);
      return session;
    } else {
      return null;
    }
  };

  /** refresh all arcs in the campaign; useful when a session is renumbered */
  const refreshAllCampaignArcs = async (campaignId: string, sessionId: string): Promise<void> => {
    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      return;

    // Refresh all arcs in the campaign
    const updateIds = campaign.arcIndex.map(arc => arc.uuid).concat(sessionId);
    await refreshCampaignDirectoryTree(updateIds);
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

  const createStoryWeb = async (campaignId: string): Promise<StoryWeb | null> => {
    const campaign = await Campaign.fromUuid(campaignId);
    if (!campaign)
      throw new Error('Bad campaign in campaignDirectoryStore.createStoryWeb()');

    const storyWeb = await StoryWeb.create(campaign);

    if (storyWeb) {
      await refreshCampaignDirectoryTree();
      return storyWeb;
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
      // Clear derived session bookmarks when no setting is active.
      await navigationStore.refreshSessionBookmarks();
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
    deleteStoryWeb,
    duplicateStoryWeb,
    createSession,
    refreshAllCampaignArcs,
    createArc,
    createFront,
    createStoryWeb,
    createCampaign,
    getCampaigns,
  };
};