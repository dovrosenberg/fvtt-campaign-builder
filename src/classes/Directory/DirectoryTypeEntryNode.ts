import { CollapsibleNode, } from '@/classes';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectoryTypeEntryNode extends CollapsibleNode<never> {
  name: string;
  
  constructor(id: string, name: string, parentId: string) {
    super(id, false, parentId, [], [], []);

    this.name = name;
  }

  /**
    * all type nodes are loaded at the topic level, so no need to do anything here
    * @override
    */
  override async _loadNodeList(): Promise<void> {}  
}