// this store handles the directory tree

// library imports
import { defineStore, storeToRefs, } from 'pinia';
import { reactive, onMounted, ref, toRaw, watch, } from 'vue';

// local imports
import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
import { NO_TYPE_STRING } from '@/utils/hierarchy';
import { useMainStore } from '@/applications/stores';
import { getTopicTextPlural, validateCompendia } from '@/compendia';
import { moduleSettings, SettingKey } from '@/settings/ModuleSettings';

// types
import { DirectoryTopicNode,  } from '@/classes';
import { DirectoryWorld, Topic, ValidTopic, DirectoryCampaign } from '@/types';
import { Entry } from '@/documents';

// the store definition
export const useCampaignDirectoryStore = defineStore('campaignDirectory', () => {
  ///////////////////////////////
  // the state

  ///////////////////////////////
  // other stores
  const mainStore = useMainStore();
  const { rootFolder, currentWorldId, currentWorldFolder, currentTopicJournals,} = storeToRefs(mainStore); 

  ///////////////////////////////
  // internal state

  ///////////////////////////////
  // external state
  
  // the top-level folder structure
  const currentCampaignTree = reactive<{value: DirectoryCampaign[]}>({value:[]});

  ///////////////////////////////
  // actions
  const collapseAll = async(): Promise<void> => {
    if (!currentWorldId.value)
      return;

    await WorldFlags.unset(currentWorldId.value, WorldFlagKey.expandedCampaignIds);

    await refreshCampaignDirectoryTree();
  };
 
  // refreshes the campaign tree 
  const refreshCampaignDirectoryTree = (): void => {
    // need to have a current world and journals loaded
    if (!currentWorldId.value || !currentTopicJournals.value)
      return;

    const campaigns = WorldFlags.get(currentWorldId.value, WorldFlagKey.campaignEntries) || {};  

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

        currentCampaignTree.value.push({
          id: id,
          name: campaigns[id],
          sessions: [],
          loadedSessions: [],
          expanded: false,
        });
      }
    }
  };

  ///////////////////////////////
  // computed state

  ///////////////////////////////
  // internal functions
  
  ///////////////////////////////
  // watchers
  // when the root folder changes, load the top level info (worlds and packs)
  watch(rootFolder, async (newRootFolder: Folder | null): Promise<void> => {
    if (!newRootFolder) {
      currentCampaignTree.value = [];
      return;
    }

    await refreshCampaignDirectoryTree();
  });

  // when the world changes, clean out the cache of loaded items
  watch(currentWorldFolder, async (newWorldFolder: Folder | null): Promise<void> => {
    if (!newWorldFolder) {
      return;
    }

    await refreshCampaignDirectoryTree();
  });
  
  // when the current journal set is updated, refresh the tree
  watch(currentTopicJournals, async (newJournals: Record<ValidTopic, JournalEntry> | null): Promise<void> => {
    if (!newJournals) {
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
    refreshCampaignDirectoryTree,
  };
});