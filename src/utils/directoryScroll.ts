import { nextTick } from 'vue';
import { useSettingDirectoryStore, useCampaignDirectoryStore, useMainStore } from '@/applications/stores';
import { WindowTabType, } from '@/types';
import { Entry, Campaign, Session, DirectoryTopicNode, DirectoryCampaignNode } from '@/classes';
import { NO_TYPE_STRING } from '@/utils/hierarchy';

/**
 * Scrolls to and expands the path for the currently active entry in the directory tree.
 * Should be called whenever a tab is activated to ensure the item is visible in the directory panel.
 * 
 * @returns A promise that resolves when the scroll operation is complete
 */
export async function scrollToActiveEntry(): Promise<void> {
  const mainStore = useMainStore();
  
  const currentTab = mainStore.currentTab;
  const currentSetting = mainStore.currentSetting;
  
  if (!currentTab || !currentSetting) {
    return;
  }

  const contentId = currentTab.header.uuid;
  
  if (!contentId) {
    return; // New tab or no content
  }

  switch (currentTab.tabType) {
    case WindowTabType.Entry:
      await scrollToEntry(contentId);
      break;
    case WindowTabType.Campaign:
      await scrollToCampaign(contentId);
      break;
    case WindowTabType.Session:
      await scrollToSession(contentId);
      break;
    case WindowTabType.PC:
      // don't have tree entries
      break;
    case WindowTabType.World:
      await scrollToWorld(contentId);
      break;
    default:
      return;
  }
}

/**
 * Scrolls to a specific entry in the setting directory tree and expands all necessary parent nodes.
 * Handles both grouped-by-type and nested hierarchy view modes.
 * 
 * @param entryId - The UUID of the entry to scroll to
 * @returns A promise that resolves when the scroll operation is complete
 */
async function scrollToEntry(entryId: string): Promise<void> {
  const mainStore = useMainStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  
  const currentSetting = mainStore.currentSetting;
  
  if (!currentSetting) {
    return;
  }

  // Load the entry to get its topic and hierarchy
  const entry = await Entry.fromUuid(entryId);
  if (!entry) {
    return;
  }

  // Check if grouped by type
  const isGroupedByType = settingDirectoryStore.isGroupedByType;

  // Find the topic node in the directory tree
  const currentWorldTree = settingDirectoryStore.currentWorldTree.value;
  const worldNode = currentWorldTree.find(w => w.id === currentSetting.uuid);
  
  if (!worldNode) {
    return;
  }

  const topicNode = worldNode.topicNodes.find(t => t.topicFolder.topic === entry.topic);
  if (!topicNode) {
    return;
  }

  // Expand the topic if it's not already expanded
  if (!topicNode.expanded) {
    await settingDirectoryStore.toggleTopic(topicNode as DirectoryTopicNode);
  }

  if (isGroupedByType) {
    // Handle grouped-by-type view
    await scrollToEntryInGroupedView(entry, topicNode as DirectoryTopicNode);
  } else {
    // Handle nested hierarchy view
    await scrollToEntryInNestedView(entryId);
  }

  // Wait for the DOM to update
  await nextTick();

  // Find and scroll to the entry element
  await scrollToElement('.fcb-current-directory-entry');
}

/**
 * Scrolls to an entry in the grouped-by-type directory view.
 * Expands the type node containing the entry if it's not already expanded.
 * 
 * @param entry - The entry to scroll to
 * @param topicNode - The topic node containing the entry
 * @returns A promise that resolves when the scroll operation is complete
 */
async function scrollToEntryInGroupedView(entry: Entry, topicNode: DirectoryTopicNode): Promise<void> {
  const settingDirectoryStore = useSettingDirectoryStore();
  
  // Find the type node for this entry's type
  // Use NO_TYPE_STRING for entries without a type (empty string or null)
  const entryType = entry.type || NO_TYPE_STRING;
  const typeNode = topicNode.loadedTypes.find(t => t.name === entryType);
  
  if (typeNode && !typeNode.expanded) {
    // Expand the type node
    await settingDirectoryStore.toggleWithLoad(typeNode, true);
  }

  // Refresh the directory tree to ensure all expansions are reflected
  await settingDirectoryStore.refreshSettingDirectoryTree();
}

/**
 * Scrolls to an entry in the nested hierarchy directory view.
 * Expands all ancestor nodes in the hierarchy to make the entry visible.
 * 
 * @param entryId - The UUID of the entry to scroll to
 * @returns A promise that resolves when the scroll operation is complete
 */
async function scrollToEntryInNestedView(entryId: string): Promise<void> {
  const mainStore = useMainStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  
  const currentSetting = mainStore.currentSetting;
  
  if (!currentSetting) {
    return;
  }

  // Get the entry hierarchy to find all ancestors that need to be expanded
  const hierarchy = currentSetting.getEntryHierarchy(entryId);
  const ancestorIds = hierarchy?.ancestors || [];

  // Expand all ancestor nodes
  for (const ancestorId of ancestorIds) {
    await currentSetting.expandNode(ancestorId);
  }

  // Refresh the directory tree to ensure all expansions are reflected
  await settingDirectoryStore.refreshSettingDirectoryTree();
}

/**
 * Scrolls to a campaign in the campaign directory tree.
 * 
 * @returns A promise that resolves when the scroll operation is complete
 */
async function scrollToCampaign(): Promise<void> {
  // Find and scroll to the campaign element using the active class
  await scrollToElement('.fcb-campaign-folder.active');
}

/**
 * Scrolls to a world in the campaign directory tree.  Just scrolls to the open one.
 * 
 * @returns A promise that resolves when the scroll operation is complete
 */
async function scrollToWorld(): Promise<void> {
  // Find and scroll to the campaign element using the active class
  await scrollToElement('.fcb-setting-folder.folder:not(.collapsed)');
}

/**
 * Scrolls to a session in the campaign directory tree.
 * Expands the parent campaign node and scrolls to the session within it.
 * 
 * @param sessionId - The UUID of the session to scroll to
 * @returns A promise that resolves when the scroll operation is complete
 */
async function scrollToSession(sessionId: string): Promise<void> {
  const campaignDirectoryStore = useCampaignDirectoryStore();
  
  // Load the session to get its campaign
  const session = await Session.fromUuid(sessionId);
  if (!session) {
    return;
  }

  const campaign = await session.loadCampaign();
  if (!campaign) {
    return;
  }

  // Find the campaign node and expand it
  const currentCampaignTree = campaignDirectoryStore.currentCampaignTree.value;
  const campaignNode = currentCampaignTree.find(c => c.id === campaign.uuid);
  
  if (campaignNode && !campaignNode.expanded) {
    // Use toggleWithLoad to expand the campaign node
    await campaignDirectoryStore.toggleWithLoad(campaignNode as DirectoryCampaignNode, true);
  }

  // Refresh the tree and wait for DOM update
  await campaignDirectoryStore.refreshCampaignDirectoryTree();
  await nextTick();

  // Find and scroll to the session element (sessions use the same highlighting class as entries)
  await scrollToElement('.fcb-current-directory-entry');
}

/**
 * Scrolls to an element in the directory tree
 */
async function scrollToElement(selector: string): Promise<void> {
  const element = document.querySelector(selector) as HTMLElement;
  
  if (element) {
    // Find the scrollable container (the directory panel)
    const scrollContainer = element.closest('.fcb-directory-panel-wrapper') as HTMLElement;
    
    if (scrollContainer) {
      // Get the element's position relative to the scroll container
      const elementRect = element.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      
      // Calculate the scroll position to center the element
      const elementTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
      const containerHeight = scrollContainer.clientHeight;
      const elementHeight = elementRect.height;
      
      const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
      
      // Smooth scroll to the element
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }
  }
} 