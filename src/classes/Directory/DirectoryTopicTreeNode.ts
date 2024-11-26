import { CollapsibleNode, DirectoryEntryNode, } from '@/classes';
import { ValidTopic } from '@/types';
import { Entry } from '@/documents';

export abstract class DirectoryTopicTreeNode extends CollapsibleNode<DirectoryEntryNode> {
  topic: ValidTopic;
  
  constructor(id: string, topic: ValidTopic, expanded: boolean = false, parentId: string | null = null,
    children: string[] = [], loadedChildren: DirectoryEntryNode[] = [], ancestors: string[] = []
  ) {
    super(id, expanded, parentId, children, loadedChildren, ancestors);

    this.topic = topic;
  }

  /**
   * loads a set of nodes, including expanded status
   * @override
   * @param ids uuids of the nodes to load
   * @param updateEntryIds uuids of the nodes that should be refreshed
   */
  override async _loadNodeList(ids: string[], updateEntryIds: string[] ): Promise<void> {
    // make sure we've loaded what we need
    if (!CollapsibleNode._currentTopicJournals || !CollapsibleNode._currentWorldId) {
      CollapsibleNode._loadedNodes = {};
      return;
    }

    // we only want to load ones not already in _loadedNodes, unless its in updateEntryIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateEntryIds.includes(id));

    const entries = CollapsibleNode._currentTopicJournals[this.topic].collections.pages.filter((e: Entry)=>uuidsToLoad.includes(e.uuid));

    for (let i=0; i<entries.length; i++) {
      const newNode = DirectoryEntryNode.fromEntry(entries[i]);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }
}