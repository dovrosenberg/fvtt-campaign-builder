/* 
 * An abstract class representing a node of any sort in the topic tree structures
 */

import { Entry, CollapsibleNode, DirectoryEntryNode, Topic, } from '@/classes';

export abstract class DirectoryTopicTreeNode extends CollapsibleNode<DirectoryEntryNode> {
  topic: Topic;
  
  constructor(id: string, topic: Topic, expanded: boolean = false, parentId: string | null = null,
    children: string[] = [], loadedChildren: DirectoryEntryNode[] = [], ancestors: string[] = []
  ) {
    super(id, expanded, parentId, children, loadedChildren, ancestors);

    this.topic = topic;
  }

  /**
   * loads a set of nodes, including expanded status
   * @override
   * @param ids uuids of the nodes to load
   * @param updateIds uuids of the nodes that should be refreshed
   */
  override async _loadNodeList(ids: string[], updateIds: string[] ): Promise<void> {
    // make sure we've loaded what we need
    if (!CollapsibleNode._currentWorld) {
      CollapsibleNode._loadedNodes = {};
      return;
    }

    // we only want to load ones not already in _loadedNodes, unless its in updateIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    const entries = this.topic.filterEntries((e: Entry)=>uuidsToLoad.includes(e.uuid));

    for (let i=0; i<entries.length; i++) {
      const newNode = DirectoryEntryNode.fromEntry(entries[i]);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }
}