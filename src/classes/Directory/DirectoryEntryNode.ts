/* 
 * A class representing an entry (which might have children) in the topic tree structure
 */

import { Hierarchy, } from '@/types';
import { TopicFolder, Entry, CollapsibleNode, DirectoryTopicTreeNode } from '@/classes';
import { NO_NAME_STRING, NO_TYPE_STRING } from '@/utils/hierarchy';

export class DirectoryEntryNode extends DirectoryTopicTreeNode {
  name: string;
  type: string;    // the type of the entry
  
  constructor(id: string, name: string, type: string, topic: TopicFolder, parentId: string | null = null, children: string[] = [], 
    loadedChildren: DirectoryEntryNode[] = [], ancestors: string[] = [], expanded: boolean = false
  ) {
    super(id, topic, expanded, parentId, children, loadedChildren, ancestors);

    this.name = name;
    this.type = type;
  }

  // converts the entry to a DirectoryEntryNode for cleaner interface
  static fromEntry = (entry: Entry): DirectoryEntryNode => {
    if (!CollapsibleNode._currentWorld)
      throw new Error('No currentWorld in DirectoryEntryNode.fromEntry()');

    const hierarchy = CollapsibleNode._currentWorld.getEntryHierarchy(entry.uuid);

    if (!entry.topicFolder)
      throw new Error('No topicFolder in DirectoryEntryNode.fromEntry()');

    return new DirectoryEntryNode(
      entry.uuid,
      entry.name || NO_NAME_STRING,
      entry.type || NO_TYPE_STRING,
      entry.topicFolder,
      hierarchy?.parentId || null,
      hierarchy?.children || [],
      [],
      hierarchy?.ancestors || [],
      false,  // TODO- load this, too
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