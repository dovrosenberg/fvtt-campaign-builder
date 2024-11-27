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
   */
  override async _loadNodeList(_ids: string[], _updateEntryIds: string[] ): Promise<void> {}
}