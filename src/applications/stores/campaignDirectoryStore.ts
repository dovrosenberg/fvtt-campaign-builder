// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, Ref, ref, watch, } from 'vue';

// local imports
import { WorldFlagKey, WorldFlags } from '@/settings';
import { useMainStore, useNavigationStore } from '@/applications/stores';
import { DirectoryCampaignNode, Campaign, Session } from '@/classes';

// types

// the store definition
export const useCampaignDirectoryStore = defineStore('campaignDirectory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorldId, currentWorldFolder, } = storeToRefs(mainStore); 

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
    if (!currentWorldId.value)
      return;

    await WorldFlags.unset(currentWorldId.value, WorldFlagKey.expandedCampaignIds);

    await refreshCampaignDirectoryTree();
  };
 
  // refreshes the campaign tree 
  const refreshCampaignDirectoryTree = async (updateIds: string[] = []): Promise<void> => {
    // need to have a current world and journals loaded
    if (!currentWorldId.value)
      return;

    isCampaignTreeLoading.value = true;

    const campaigns = WorldFlags.get(currentWorldId.value, WorldFlagKey.campaignEntries) || {};  
    const expandedNodes = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedCampaignIds) || {};

    currentCampaignTree.value = [];
    
    // get the all the campaigns 
    for (let i=0; i<Object.keys(campaigns).length; i++) {
      const id = Object.keys(campaigns)[i];
      const children = (await Session.getSessionsForCampaign(id)).map(session => session.uuid);

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
    await Campaign.deleteCampaign(campaignId);

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(campaignId);

    await refreshCampaignDirectoryTree();
  };

  const deleteSession = async (sessionId: string): Promise<void> => {
    await Session.deleteSession(sessionId);

    // update tabs/bookmarks
    await navigationStore.cleanupDeletedEntry(sessionId);

    await refreshCampaignDirectoryTree();
  };

  const createSession = async (campaignId: string) => {
    await Session.create(campaignId);
    await refreshCampaignDirectoryTree();
  };
  
  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  
  ///////////////////////////////
  // watchers

  // when the world changes, clean out the cache of loaded items
  watch(currentWorldFolder as Ref<Folder | null>, async (newWorldFolder: Folder | null): Promise<void> => {
    if (!newWorldFolder) {
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