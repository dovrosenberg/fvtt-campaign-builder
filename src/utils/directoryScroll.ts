import { nextTick } from 'vue';
import { useTopicDirectoryStore, useCampaignDirectoryStore, useMainStore } from '@/applications/stores';
import { WindowTabType, } from '@/types';
import { Entry, Campaign, Session, PC, DirectoryTopicNode, DirectoryCampaignNode } from '@/classes';
import { NO_TYPE_STRING } from '@/utils/hierarchy';

/**
 * Scrolls to and expands the path for the currently active entry in the directory tree
 * Should be called whenever a tab is activated to ensure the item is visible
 */
export async function scrollToActiveEntry(): Promise<void> {
  const mainStore = useMainStore();
  
  const currentTab = mainStore.currentTab;
  const currentWorld = mainStore.currentWorld;
  
  if (!currentTab || !currentWorld) {
    return;
  }

  const contentId = currentTab.header.uuid;
  
  if (!contentId) {
    return; // New tab or no content
  }

  try {
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
        await scrollToPC(contentId);
        break;
      // World tabs don't have entries in the directory tree
      default:
        return;
    }
  } catch (error) {
    console.warn('Failed to scroll to active entry in directory:', error);
  }
}

/**
 * Scrolls to an entry in the topic directory tree
 */
async function scrollToEntry(entryId: string): Promise<void> {
  const mainStore = useMainStore();
  const topicDirectoryStore = useTopicDirectoryStore();
  
  const currentWorld = mainStore.currentWorld;
  
  if (!currentWorld) {
    return;
  }

  // Load the entry to get its topic and hierarchy
  const entry = await Entry.fromUuid(entryId);
  if (!entry) {
    return;
  }

  // Check if grouped by type
  const isGroupedByType = topicDirectoryStore.isGroupedByType;

  // Find the topic node in the directory tree
  const currentWorldTree = topicDirectoryStore.currentWorldTree.value;
  const worldNode = currentWorldTree.find(w => w.id === currentWorld.uuid);
  
  if (!worldNode) {
    return;
  }

  const topicNode = worldNode.topicNodes.find(t => t.topicFolder.topic === entry.topic);
  if (!topicNode) {
    return;
  }

  // Expand the topic if it's not already expanded
  if (!topicNode.expanded) {
    await topicDirectoryStore.toggleTopic(topicNode as DirectoryTopicNode);
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
  await scrollToElement(entryId);
}

/**
 * Scrolls to an entry in the grouped-by-type view
 */
async function scrollToEntryInGroupedView(entry: Entry, topicNode: DirectoryTopicNode): Promise<void> {
  const topicDirectoryStore = useTopicDirectoryStore();
  
  // Find the type node for this entry's type
  // Use NO_TYPE_STRING for entries without a type (empty string or null)
  const entryType = entry.type || NO_TYPE_STRING;
  const typeNode = topicNode.loadedTypes.find(t => t.name === entryType);
  
  if (typeNode && !typeNode.expanded) {
    // Expand the type node
    await topicDirectoryStore.toggleWithLoad(typeNode, true);
  }

  // Refresh the directory tree to ensure all expansions are reflected
  await topicDirectoryStore.refreshTopicDirectoryTree();
}

/**
 * Scrolls to an entry in the nested hierarchy view
 */
async function scrollToEntryInNestedView(entryId: string): Promise<void> {
  const mainStore = useMainStore();
  const topicDirectoryStore = useTopicDirectoryStore();
  
  const currentWorld = mainStore.currentWorld;
  
  if (!currentWorld) {
    return;
  }

  // Get the entry hierarchy to find all ancestors that need to be expanded
  const hierarchy = currentWorld.getEntryHierarchy(entryId);
  const ancestorIds = hierarchy?.ancestors || [];

  // Expand all ancestor nodes
  for (const ancestorId of ancestorIds) {
    await currentWorld.expandNode(ancestorId);
  }

  // Refresh the directory tree to ensure all expansions are reflected
  await topicDirectoryStore.refreshTopicDirectoryTree();
}

/**
 * Scrolls to a campaign in the campaign directory tree
 */
async function scrollToCampaign(campaignId: string): Promise<void> {
  const campaignDirectoryStore = useCampaignDirectoryStore();
  
  // Load the campaign
  const campaign = await Campaign.fromUuid(campaignId);
  if (!campaign) {
    return;
  }

  // Ensure the campaign tree is loaded
  await campaignDirectoryStore.refreshCampaignDirectoryTree();

  // Wait for the DOM to update
  await nextTick();

  // Find and scroll to the campaign element
  await scrollToElement(campaignId, '[data-campaign]');
}

/**
 * Scrolls to a session in the campaign directory tree
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
  await scrollToElement(sessionId);
}

/**
 * Scrolls to a PC (currently PCs might not have direct representation in directory)
 */
async function scrollToPC(pcId: string): Promise<void> {
  // PCs are typically managed within campaigns
  // This might need adjustment based on how PCs are displayed in the directory
  const pc = await PC.fromUuid(pcId);
  if (!pc) {
    return;
  }

  const campaign = await pc.loadCampaign();
  if (!campaign) {
    return;
  }

  // For now, just scroll to the campaign
  await scrollToCampaign(campaign.uuid);
}

/**
 * Scrolls to an element in the directory tree
 */
async function scrollToElement(contentId: string, selector?: string): Promise<void> {
  // Default selector looks for the highlighted entry class
  const defaultSelector = `.fcb-current-directory-entry`;
  
  // If a specific selector is provided, use it with the content ID
  const elementSelector = selector ? `${selector}="${contentId}"` : defaultSelector;
  
  const element = document.querySelector(elementSelector) as HTMLElement;
  
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