/* 
 * A class representing an entry (which might have children) in the topic tree structure
 */

import { EntryBasicIndex, Hierarchy, } from '@/types';
import { TopicFolder, CollapsibleNode, DirectoryTopicTreeNode } from '@/classes';
import { NO_NAME_STRING, NO_TYPE_STRING } from '@/utils/hierarchy';

export class DirectoryEntryNode extends DirectoryTopicTreeNode {
  name: string;
  type: string;    // the type of the entry
  
  constructor(id: string, name: string, type: string, topicFolder: TopicFolder, parentId: string | null = null, children: string[] = [], 
    loadedChildren: DirectoryEntryNode[] = [], ancestors: string[] = [], expanded: boolean = false
  ) {
    super(id, topicFolder, expanded, parentId, children, loadedChildren, ancestors);

    this.name = name;
    this.type = type;
  }

  // converts the entry to a DirectoryEntryNode for cleaner interface
  static fromEntryBasicIndex = (entry: EntryBasicIndex, parentTopicFolder: TopicFolder): DirectoryEntryNode => {
    if (!CollapsibleNode._currentSetting)
      throw new Error('No currentSetting in DirectoryEntryNode.fromEntryBasicIndex()');

    const hierarchy = CollapsibleNode._currentSetting.getEntryHierarchy(entry.uuid);
    const expandedIds = CollapsibleNode._currentSetting.expandedIds;
    const expanded = (expandedIds && expandedIds[entry.uuid]) || false;

    return new DirectoryEntryNode(
      entry.uuid,
      entry.name || NO_NAME_STRING,
      entry.type || NO_TYPE_STRING,
      parentTopicFolder,
      hierarchy?.parentId || null,
      hierarchy?.children || [],
      [],
      hierarchy?.ancestors || [],
      expanded,
    );
  };

  // converts a DirectoryEntryNode to a Hierarchy object
  public convertToHierarchy = (): Hierarchy => {
    return {
      parentId: this.parentId,
      children: this.children,
      ancestors: this.ancestors,
      type: this.type,
    };
  };
}