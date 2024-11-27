import { CollapsibleNode, DirectoryTypeNode, } from '@/classes';
import { Entry } from '@/documents';
import { NO_NAME_STRING } from '@/utils/hierarchy';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectoryTypeEntryNode extends CollapsibleNode<never> {
  name: string;
  
  constructor(id: string, name: string, parentId: string) {
    super(id, false, parentId, [], [], []);

    this.name = name;
  }

  // converts the entry to a DirectoryTypeEntryNode for cleaner interface
  static fromEntry = (entry: Entry, parentTypeNode: DirectoryTypeNode): DirectoryTypeEntryNode => {
    return new DirectoryTypeEntryNode(
      entry.uuid,
      entry.name || NO_NAME_STRING,
      parentTypeNode.id,
    );
  };

  /**
    * all type nodes are loaded at the topic level, so no need to do anything here
    * @override
    */
  override async _loadNodeList(): Promise<void> {}  
}