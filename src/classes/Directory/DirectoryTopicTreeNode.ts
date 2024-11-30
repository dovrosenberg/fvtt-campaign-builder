/* 
 * An abstract class representing a node of any sort in the topic tree structures
 */

import { Entry, CollapsibleNode, DirectoryEntryNode, } from '@/classes';
import { ValidTopic } from '@/types';
import { WorldFlagKey } from '@/settings/WorldFlags';

export abstract class DirectoryTopicTreeNode extends CollapsibleNode<DirectoryEntryNode> {
  topic: ValidTopic;
  
  constructor(id: string, topic: ValidTopic, expanded: boolean = false, parentId: string | null = null,
    children: string[] = [], loadedChildren: DirectoryEntryNode[] = [], ancestors: string[] = []
  ) {
    super(id, expanded, WorldFlagKey.expandedIds, parentId, children, loadedChildren, ancestors);

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
    if (!CollapsibleNode._currentWorldId) {
      CollapsibleNode._loadedNodes = {};
      return;
    }

    // we only want to load ones not already in _loadedNodes, unless its in updateIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    const entries = Entry.filter(this.topic, (e: Entry)=>uuidsToLoad.includes(e.uuid));

    for (let i=0; i<entries.length; i++) {
      const newNode = DirectoryEntryNode.fromEntry(entries[i]);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }
}