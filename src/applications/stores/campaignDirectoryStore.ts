// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, ref, watch, } from 'vue';

// local imports
import { useMainStore, useNavigationStore } from '@/applications/stores';
import { DirectoryCampaignNode, Campaign, Session, WBWorld, } from '@/classes';
import { FCBDialog } from '@/dialogs';

// types

// the store definition
export const useCampaignDirectoryStore = defineStore('campaignDirectory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorld, currentEntry} = storeToRefs(mainStore); 

  ///////////////////////////////
  // internal state
  const isCampaignTreeLoading = ref<boolean>(false);

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

  const collapseAll = async(): Promise<void> => {
    if (!currentWorld.value)
      return;

    await currentWorld.value.collapseCampaignDirectory();

    await refreshCampaignDirectoryTree();
  };
 
  // refreshes the campaign tree 
  const refreshCampaignDirectoryTree = async (updateIds: string[] = []): Promise<void> => {
    // need to have a current world and journals loaded
    if (!currentWorld.value)
      return;

    isCampaignTreeLoading.value = true;

    const expandedNodes = currentWorld.value.expandedIds || {};

    currentCampaignTree.value = [];
    
    // get all the campaigns - we could just use campaignNames but this will clean up any bad ones (i.e. got deleted incompletely)
    await currentWorld.value.loadCampaigns();
    const campaigns = currentWorld.value.campaigns;

    for (const id in campaigns) {
      const campaign = await Campaign.fromUuid(id);

      // shouldn't happen but maybe something didn't get cleaned up; we'll clean it up in WBWorld.loadCampaigns() at some point
      if (!campaign) {
        continue;
      }

      const children = campaign.sessions.map(session => session.uuid);

      currentCampaignTree.value.push(new DirectoryCampaignNode(
        id,
        campaigns[id].name,  // name
        children,
        [],
        expandedNodes[id] || false,
      ));      
    }
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

    isCampaignTreeLoading.value = false;
  };

  const deleteCampaign = async(campaignId: string): Promise<void> => {
    // have to delete all the sessions, too - not from the database (since deleting campaign
    //    will do that), but from the UI
    const campaign = await Campaign.fromUuid(campaignId);

    if (!campaign) 
      throw new Error('Bad campaign in campaignDirectoryStore.deleteCampaign()');

    // confirm
    if (!(await FCBDialog.confirmDialog('Delete campaign?', 'Are you sure you want to delete this campaign?')))
      return;
  
    const sessions = campaign.sessions;
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

  const createCampaign = async (): Promise<Campaign | null> => {
    let campaign: Campaign | null = null;

    if (currentWorld.value) {
      campaign = await Campaign.create(currentWorld.value as WBWorld);
      await refreshCampaignDirectoryTree();
    }

    if (campaign) {
      await navigationStore.openCampaign(campaign.uuid, {newTab: true});
    }

    return campaign;
  };

  /**
   * Gets all campaigns in the current world
   * @returns Array of Campaign objects
   */
  const getCampaigns = async (): Promise<Campaign[]> => {
    if (!currentWorld.value) {
      return [];
    }

    await currentWorld.value.loadCampaigns();
    let campaignList = [] as Campaign[];
    for (const campaignId in currentWorld.value.campaigns) {
      campaignList.push(currentWorld.value.campaigns[campaignId]);
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

  // when the world changes, clean out the cache of loaded items
  watch(currentWorld, async (newWorld: WBWorld | null): Promise<void> => {
    if (!newWorld) {
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

    collapseAll,
    toggleWithLoad,
    refreshCampaignDirectoryTree,
    deleteCampaign,
    deleteSession,
    createSession,
    createCampaign,
    getCampaigns,
  };
});