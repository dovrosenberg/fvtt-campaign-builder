import { CollapsibleNode, DirectoryEntryNode, } from '@/classes';

export class DirectoryCampaignNode extends CollapsibleNode<DirectoryEntryNode> {
  name: string;
  
  // children are for the entries; loadedTypes is for the type nodes
  constructor(id: string, name: string, expanded: boolean = false,
    children: string[] = [], loadedChildren: DirectoryEntryNode[] = [], 
  ) {

    super(id, expanded, null, children, loadedChildren, []);

    this.name = name;
  }

  /**
   * loads a set of nodes, including expanded status
   * @override
   * @param ids uuids of the nodes to load
   * @param updateIds uuids of the nodes that should be refreshed
   */
  override async _loadNodeList(ids: string[], updateIds: string[] ): Promise<void> {
    // make sure we've loaded what we need
    if (!CollapsibleNode._currentTopicJournals || !CollapsibleNode._currentWorldId) {
      CollapsibleNode._loadedNodes = {};
      return;
    }

    // we only want to load ones not already in _loadedNodes, unless its in updateEntryIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    const entries = CollapsibleNode._currentTopicJournals[this.topic].collections.pages.filter((e: Entry)=>uuidsToLoad.includes(e.uuid));

    for (let i=0; i<entries.length; i++) {
      const newNode = DirectoryEntryNode.fromEntry(entries[i]);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }
}