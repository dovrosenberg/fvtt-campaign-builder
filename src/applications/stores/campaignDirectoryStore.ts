// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, ref, watch, } from 'vue';

// local imports
import { useMainStore, useNavigationStore } from '@/applications/stores';
import { DirectoryCampaignNode, Campaign, Session, WBWorld, } from '@/classes';

// types

// the store definition
export const useCampaignDirectoryStore = defineStore('campaignDirectory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorld, } = storeToRefs(mainStore); 

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

    const campaigns = currentWorld.value?.campaignNames || {};  
    const expandedNodes = currentWorld.value?.expandedIds || {};

    currentCampaignTree.value = [];
    
    // get the all the campaigns 
    for (const id in campaigns) {
      const campaign = await Campaign.fromUuid(id);

      if (!campaign)
        throw new Error('Bad campaign in campaignDirectoryStore.refreshCampaignDirectoryTree()');

      const children = (await campaign.getSessions()).map(session => session.uuid);

      currentCampaignTree.value.push(new DirectoryCampaignNode(
        id,
        campaigns[id],  // name
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

    isCampaignTreeLoading.value = false;
  };

  const deleteCampaign = async(campaignId: string): Promise<void> => {
    // have to delete all the sessions, too - not from the database (since deleting campaign
    //    will do that), but from the UI
    const campaign = await Campaign.fromUuid(campaignId);

    if (!campaign) 
      throw new Error('Bad campaign in campaignDirectoryStore.deleteCampaign()');

    const sessions = await campaign.getSessions();
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
  };
});