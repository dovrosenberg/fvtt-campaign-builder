import { CollapsibleNode, } from '@/classes';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectorySessionNode extends CollapsibleNode<never> {
  name: string;
  
  constructor(id: string, name: string, parentId: string) {
    super(id, false, parentId, [], [], []);

    this.name = name;
  }

  /**
    * no children
    * @override
    */
  override async _loadNodeList(_ids: string[], _updateEntryIds: string[] ): Promise<void> {}
}