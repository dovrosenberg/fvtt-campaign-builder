/* 
 * A class representing an entry (which might have children) in the topic tree structure
 */

import { EntryBasicIndex, Hierarchy, } from '@/types';
import { TopicFolder, CollapsibleNode, DirectoryTopicTreeNode } from '@/classes';
import { NO_NAME_STRING, NO_TYPE_STRING } from '@/utils/hierarchy';

export class DirectoryEntryNode extends DirectoryTopicTreeNode {
  name: string;
  type: string;    // the type of the entry
  /** UUIDs of branch entries (organization presences in locations) */
  childBranches: string[];
  
  constructor(id: string, name: string, type: string, topicFolder: TopicFolder, parentId: string | null = null, children: string[] = [], 
    loadedChildren: DirectoryEntryNode[] = [], ancestors: string[] = [], expanded: boolean = false, childBranches: string[] = []
  ) {
    super(id, topicFolder, expanded, parentId, children, loadedChildren, ancestors);

    this.name = name;
    this.type = type;
    this.childBranches = childBranches;
  }

  // converts the entry to a DirectoryEntryNode for cleaner interface
  static fromEntryBasicIndex = (entry: EntryBasicIndex, parentTopicFolder: TopicFolder): DirectoryEntryNode => {
    if (!CollapsibleNode._currentSetting)
      throw new Error('No currentSetting in DirectoryEntryNode.fromEntryBasicIndex()');

    const hierarchy = CollapsibleNode._currentSetting.getEntryHierarchy(entry.uuid);
    const expandedIds = CollapsibleNode._currentSetting.expandedIds;
    const expanded = (expandedIds && expandedIds[entry.uuid]) || false;
    const childBranches = hierarchy?.childBranches || [];

    // Build children array: regular children plus branch folder if there are branches
    let children = hierarchy?.children || [];
    if (childBranches.length > 0) {
      // Add synthetic branch folder ID to children so it gets loaded like story webs
      children = [...children, `${entry.uuid}.branches`];
    }

    return new DirectoryEntryNode(
      entry.uuid,
      entry.name || NO_NAME_STRING,
      entry.type || NO_TYPE_STRING,
      parentTopicFolder,
      hierarchy?.parentId || null,
      children,
      [],
      hierarchy?.ancestors || [],
      expanded,
      childBranches,
    );
  };

  // converts a DirectoryEntryNode to a Hierarchy object
  public convertToHierarchy = (): Hierarchy => {
    return {
      parentId: this.parentId,
      locationParentId: null,
      // Filter out synthetic branch folder IDs - they shouldn't be saved to the database
      children: this.children.filter((id) => !id.endsWith('.branches')),
      childBranches: this.childBranches,
      ancestors: this.ancestors,
      type: this.type,
    };
  };
}