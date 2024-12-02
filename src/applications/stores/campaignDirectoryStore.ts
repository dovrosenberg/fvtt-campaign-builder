// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, ref, watch, } from 'vue';

// local imports
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { useMainStore } from '@/applications/stores';
import { DirectoryCampaignNode, Campaign, Session } from '@/classes';

// types

// the store definition
export const useCampaignDirectoryStore = defineStore('campaignDirectory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
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
    const expandedNodes = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds) || {};

    currentCampaignTree.value = [];
    
    // get the all the campaigns 
    for (let i=0; i<Object.keys(campaigns).length; i++) {
      const id = Object.keys(campaigns)[i];
      const children = (await Session.getSessionsForCampaign(id)).map(session => session.uuid);

      currentCampaignTree.value.push(new DirectoryCampaignNode(
        id,
        campaigns[id],  // name
        expandedNodes[id] || false,
        children,
        [],
      ));      
    }
    currentCampaignTree.value.sort((a: DirectoryCampaignNode, b: DirectoryCampaignNode) => a.name.localeCompare(b.name));

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
    await refreshCampaignDirectoryTree();
  }

  const deleteSession = async (sessionId: string): Promise<void> => {
    await Session.deleteSession(sessionId);
    await refreshCampaignDirectoryTree();
  }

  const createSession = async (campaignId: string) => {
    await Session.create(campaignId);
    await refreshCampaignDirectoryTree();
}
  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  
  ///////////////////////////////
  // watchers

  // when the world changes, clean out the cache of loaded items
  watch(currentWorldFolder, async (newWorldFolder: Folder | null): void => {
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