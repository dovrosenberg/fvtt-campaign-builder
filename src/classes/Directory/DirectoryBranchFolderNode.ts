/* 
 * A class representing a virtual "Branches" folder in the directory tree.
 * This folder appears under organizations and locations that have branches.
 */

import { CollapsibleNode, DirectoryBranchEntryNode } from '@/classes';
import { TopicFolder } from '@/classes';
import { EntryBasicIndex } from '@/types';

/**
 * A virtual folder node that contains branch entries.
 * Appears under organizations and locations that have child branches.
 */
export class DirectoryBranchFolderNode extends CollapsibleNode<DirectoryBranchEntryNode> {
  /** The UUID of the parent entry (organization or location) */
  parentId: string;
  
  /** The topic folder for reference */
  topicFolder: TopicFolder;
  
  /**
   * Creates a new DirectoryBranchFolderNode.
   * 
   * @param parentId - UUID of the parent entry (organization or location)
   * @param topicFolder - The topic folder for the parent's topic
   * @param children - UUIDs of branch entries
   * @param expanded - Whether the folder is expanded
   */
  constructor(
    parentId: string,
    topicFolder: TopicFolder,
    children: string[] = [],
    loadedChildren: DirectoryBranchEntryNode[] = [],
    expanded: boolean = false
  ) {
    // ID is parent UUID + ".branches"
    super(`${parentId}.branches`, expanded, parentId, children, loadedChildren, []);
    
    this.parentId = parentId;
    this.topicFolder = topicFolder;
  }

  /**
   * Loads branch entry nodes from the topic folder's entry index.
   * Branches are loaded from the entry index filtered by the children UUIDs.
   * 
   * @override
   * @param ids - UUIDs of the branch entries to load
   * @param updateEntryIds - UUIDs of entries that should be refreshed
   */
  override async _loadNodeList(ids: string[], updateEntryIds: string[]): Promise<void> {
    // Make sure we've loaded what we need
    if (!CollapsibleNode._currentSetting) {
      CollapsibleNode._loadedNodes = {};
      return;
    }

    // We only want to load ones not already in _loadedNodes, unless it's in updateEntryIds
    const uuidsToLoad = ids.filter((id) => !CollapsibleNode._loadedNodes[id] || updateEntryIds.includes(id));

    const entryIndices = this.topicFolder.entryIndex.filter((index: EntryBasicIndex) => uuidsToLoad.includes(index.uuid));

    for (const index of entryIndices) {
      const newNode = DirectoryBranchEntryNode.fromEntryBasicIndex(index, this.topicFolder, this.parentId);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }
}
