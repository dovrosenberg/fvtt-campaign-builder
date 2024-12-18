/* 
 * A class representing an entry in the topic tree structures (when in group by type mode)
 */

import { CollapsibleNode, DirectoryTypeEntryNode } from '@/classes';
import { WorldFlagKey } from '@/settings';

// a type "group"; used when showing the tree grouped by type
// its children are DirectoryTypeEntryNodes (which are like regular entries but they can't have children)
export class DirectoryTypeNode extends CollapsibleNode<DirectoryTypeEntryNode> {
  name: string;
  
  // children are for the entries; 
  constructor(topicId: string, name: string, children: string[] = [], loadedChildren: DirectoryTypeEntryNode[] = [], 
    expanded: boolean = false
  ) {

    super(topicId + ':' + name, expanded, WorldFlagKey.expandedIds, null, children, loadedChildren, []);

    this.name = name;
  }

  /**
    * all type nodes are loaded at the topic level, so no need to do anything here
    * @override
    */
  override async _loadNodeList(_ids: string[], _updateEntryIds: string[] ): Promise<void> {}
}