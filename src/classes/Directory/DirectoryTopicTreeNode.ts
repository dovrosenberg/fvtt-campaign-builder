/* 
 * An abstract class representing a node of any sort in the topic tree structures
 */

import { CollapsibleNode, DirectoryEntryNode, TopicFolder, } from '@/classes';
import { EntryFilterIndex } from '@/types';

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

    const entries = await this.topicFolder.filterEntries((e: EntryFilterIndex)=>uuidsToLoad.includes(e.uuid), true);

    for (let i=0; i<entries.length; i++) {
      const newNode = await DirectoryEntryNode.fromEntry(entries[i]);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }
}