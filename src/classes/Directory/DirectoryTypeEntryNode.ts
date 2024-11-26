import { ValidTopic, } from '@/types';
import { CollapsibleNode } from './CollapsibleNode';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectoryTypeEntryNode extends CollapsibleNode {
  name: string;
  
  constructor(id: string, topic: ValidTopic, name: string, parentId: string) {
    super(id, topic, false, parentId, [], [], []);

    this.name = name;
  }
}