/* 
 * A class representing a type grouping node in the topic tree structures (when in group by type mode)
 */

import { Entry, CollapsibleNode, DirectoryTypeNode, } from '@/classes';
import { NO_NAME_STRING } from '@/utils/hierarchy';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectoryTypeEntryNode extends CollapsibleNode<never> {
  name: string;
  
  constructor(id: string, name: string, parentId: string | null) {
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
    * no children
    * @override
    */
  override async _loadNodeList(_ids: string[], _updateEntryIds: string[] ): Promise<void> {}
}