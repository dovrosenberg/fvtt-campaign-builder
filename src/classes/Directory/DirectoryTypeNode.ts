import { ValidTopic, } from '@/types';
import { CollapsibleNode, DirectoryTypeEntryNode } from '@/classes';

// a type "group"; used when showing the tree grouped by type
// its children are DirectoryTypeEntryNodes (which are like regular entries but they can't have children)
export class DirectoryTypeNode extends CollapsibleNode<DirectoryTypeEntryNode> {
  name: string;
  
  // children are for the entries; 
  constructor(id: string, name: string, children: string[] = [], loadedChildren: DirectoryTypeEntryNode[] = [], 
    expanded: boolean = false
  ) {

    super(id, expanded, null, children, loadedChildren, []);

    this.name = name;
  }

  /**
    * all type nodes are loaded at the topic level, so no need to do anything here
    * @override
    */
  override async _loadNodeList(): Promise<void> {}  
}