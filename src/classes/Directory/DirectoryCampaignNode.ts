import { CollapsibleNode, DirectoryEntryNode, } from '@/classes';

export class DirectoryCampaignNode extends CollapsibleNode<DirectoryEntryNode> {
  name: string;
  
  // children are for the entries; loadedTypes is for the type nodes
  constructor(id: string, name: string, expanded: boolean | null = false,
    children: string[] = [], loadedChildren: DirectoryEntryNode[] = [], 
  ) {

    super(id, expanded, null, children, loadedChildren, []);

    this.name = name;
  }

  /**
   * loads a set of nodes, including expanded status
   * @override
   * @param ids uuids of the nodes to load
   * @param updateEntryIds uuids of the nodes that should be refreshed
   */
  override async _loadNodeList(ids: string[], updateEntryIds: string[] ): Promise<void> {}
}