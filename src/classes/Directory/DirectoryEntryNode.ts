/* 
 * A class representing an entry (which might have children) in the topic tree structure
 */


import { ValidTopic, } from '@/types';
import { CollapsibleNode, DirectoryTopicTreeNode } from '@/classes';
import { EntryDoc } from '@/documents';
import { WorldFlags } from '@/settings/WorldFlags';
import { Hierarchy, NO_NAME_STRING, NO_TYPE_STRING } from '@/utils/hierarchy';

export class DirectoryEntryNode extends DirectoryTopicTreeNode {
  name: string;
  type: string;    // the type of the entry
  
  constructor(id: string, name: string, type: string, topic: ValidTopic, parentId: string | null = null, children: string[] = [], 
    loadedChildren: DirectoryEntryNode[] = [], ancestors: string[] = [], expanded: boolean = false
  ) {
    super(id, topic, expanded, parentId, children, loadedChildren, ancestors);

    this.name = name;
    this.type = type;
  }

  // converts the entry to a DirectoryEntryNode for cleaner interface
  static fromEntry = (entry: EntryDoc): DirectoryEntryNode => {
    if (!CollapsibleNode._currentWorldId)
      throw new Error('No currentWorldId in DirectoryEntryNode.fromEntry()');

    const hierachy = WorldFlags.getHierarchy(CollapsibleNode._currentWorldId, entry.uuid);

    if (!entry.system.topic)
      throw new Error('No topic in DirectoryEntryNode.fromEntry()');

    return new DirectoryEntryNode(
      entry.uuid,
      entry.name || NO_NAME_STRING,
      entry.system.type || NO_TYPE_STRING,
      entry.system.topic,
      hierachy?.parentId || null,
      hierachy?.children || [],
      [],
      hierachy?.ancestors || [],
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