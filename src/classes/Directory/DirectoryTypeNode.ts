import { ValidTopic, } from '@/types';
import { CollapsibleNode, DirectoryTypeEntryNode } from '@/classes';

// a type "group"
// export type DirectoryTypeNode = {
//   loadedChildren: DirectoryTypeEntryNode[];
// }
export class DirectoryTypeNode extends CollapsibleNode{
  name: string;
  
  // children are for the entries; 
  constructor(id: string, name: string, topic: ValidTopic, children: string[] = [], loadedChildren: DirectoryTypeEntryNode[] = [], 
    expanded: boolean = false
  ) {

    super(id, topic, expanded, null, children, loadedChildren, []);

    this.name = name;
  }
}