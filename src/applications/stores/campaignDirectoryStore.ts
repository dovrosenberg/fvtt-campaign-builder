// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, watch, } from 'vue';

// local imports
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { useMainStore } from '@/applications/stores';
import { DirectoryCampaignNode, Campaign } from '@/classes';

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

    refreshCampaignDirectoryTree();
  };
 
  // refreshes the campaign tree 
  const refreshCampaignDirectoryTree = (): void => {
    // need to have a current world and journals loaded
    if (!currentWorldId.value)
      return;

    const campaigns = WorldFlags.get(currentWorldId.value, WorldFlagKey.campaignEntries) || {};  
    const expandedNodes = WorldFlags.get(currentWorldId.value, WorldFlagKey.expandedIds);

    let updateCampaigns = false;
    if (Object.keys(campaigns).length != currentCampaignTree.value.length) {
      updateCampaigns = true;
    } else if (currentCampaignTree.value.length > 0) {
      // same length - make sure they all match
      for (let i=0; i<currentCampaignTree.value.length; i++) {
        // see if it's in there; if not, we need to update
        if (!campaigns[currentCampaignTree.value[i].id]) {
          updateCampaigns = true;
          break;
        }
      }
    }

    if (updateCampaigns) {
      currentCampaignTree.value = [];
      
      // get the all the entries 
      for (let i=0; i<Object.keys(campaigns).length; i++) {
        const id = Object.keys(campaigns)[i];

        currentCampaignTree.value.push(new DirectoryCampaignNode(
          id,
          campaigns[id],
          expandedNodes[id] || false,
          [],
          [],
        ));
      }
    }
  };

  const deleteCampaign = async(campaignId: string): Promise<void> => {
    await Campaign.deleteCampaign(campaignId);
  }

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  
  ///////////////////////////////
  // watchers

  // when the world changes, clean out the cache of loaded items
  watch(currentWorldFolder, (newWorldFolder: Folder | null): void => {
    if (!newWorldFolder) {
      currentCampaignTree.value = [];
      return;
    }

    refreshCampaignDirectoryTree();
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
    deleteCampaign
  };
});