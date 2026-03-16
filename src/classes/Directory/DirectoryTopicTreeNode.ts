/* 
 * An abstract class representing a node of any sort in the topic tree structures
 */

import { CollapsibleNode, DirectoryBranchFolderNode, DirectoryEntryNode, TopicFolder, } from '@/classes';
import { EntryBasicIndex, Topics } from '@/types';

export abstract class DirectoryTopicTreeNode extends CollapsibleNode<DirectoryEntryNode> {
  topicFolder: TopicFolder;
  
  constructor(id: string, topicFolder: TopicFolder, expanded: boolean = false, parentId: string | null = null,
    children: string[] = [], loadedChildren: DirectoryEntryNode[] = [], ancestors: string[] = []
  ) {
    super(id, expanded, parentId, children, loadedChildren, ancestors);

    this.topicFolder = topicFolder;
  }

  /**
   * loads a set of nodes, including expanded status
   * @override
   * @param ids uuids of the nodes to load
   * @param updateIds uuids of the nodes that should be refreshed
   */
  override async _loadNodeList(ids: string[], updateIds: string[] ): Promise<void> {
    // make sure we've loaded what we need
    if (!CollapsibleNode._currentSetting) {
      CollapsibleNode._loadedNodes = {};
      return;
    }

    // we only want to load ones not already in _loadedNodes, unless its in updateIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    // Handle synthetic branch folder IDs (ending in .branches)
    const branchFolderIds = uuidsToLoad.filter((id) => id.endsWith('.branches'));
    for (const branchFolderId of branchFolderIds) {
      const parentId = branchFolderId.replace('.branches', '');
      const hierarchy = CollapsibleNode._currentSetting.getEntryHierarchy(parentId);
      const childBranches = hierarchy?.childBranches || [];
      const expandedIds = CollapsibleNode._currentSetting.expandedIds || {};
      const expanded = expandedIds[branchFolderId] || false;

      // Branches are always Organization entries, even when displayed under a Location
      const organizationTopicFolder = CollapsibleNode._currentSetting.topicFolders[Topics.Organization];
      if (!organizationTopicFolder) {
        continue;
      }

      const newNode = new DirectoryBranchFolderNode(
        parentId,
        organizationTopicFolder,
        childBranches,
        [],
        expanded
      );
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }

    // Filter out branches and synthetic folder IDs - they should only appear in Branches folders
    const entryIndices = this.topicFolder.entryIndex
      .filter((index: EntryBasicIndex)=>uuidsToLoad.includes(index.uuid) && !index.isBranch);

    for (const index of entryIndices) {
      const newNode = DirectoryEntryNode.fromEntryBasicIndex(index, this.topicFolder);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }
}