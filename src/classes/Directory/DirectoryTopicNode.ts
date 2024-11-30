/* 
 * An node representing a topic in the topic tree structures
 */

import { ValidTopic, } from '@/types';
import { Entry, DirectoryTopicTreeNode, DirectoryEntryNode, DirectoryTypeNode, DirectoryTypeEntryNode, CollapsibleNode } from '@/classes';
import { NO_TYPE_STRING } from '@/utils/hierarchy';

export class DirectoryTopicNode extends DirectoryTopicTreeNode {
  name: string;
  loadedTypes: DirectoryTypeNode[];
  
  // children are for the entries; loadedTypes is for the type nodes
  constructor(id: string, name: string, topic: ValidTopic, 
    children: string[] = [], loadedChildren: DirectoryEntryNode[] = [], 
    loadedTypes: DirectoryTypeNode[] = [], expanded: boolean = false
  ) {

    super(id, topic, expanded, null, children, loadedChildren, []);

    this.name = name;
    this.loadedTypes = loadedTypes;
  }

  /**
   * This function is used to load all of the type entries for a particular topic.
   * @param types the types for this topic
   * @param expandedIds the ids that are currently expanded
   * @returns a promise that resolves when the entries are loaded
   */
  public async loadTypeEntries (types: string [], expandedIds: Record<string, boolean | null>): Promise<void> {
    // this is relatively fast for now, so we just load them all... otherwise, we need a way to index the entries by 
    //    type on the journalentry, or pack or world, which is a lot of extra data (or consider a special subtype of Journal Entry with a type field in the data model
    //    that is also in the index)

    // create the loadedType nodes then populate their children
    this.loadedTypes = types.map((type: string): DirectoryTypeNode => {
      const retval = new DirectoryTypeNode(
        this.id,
        type,
        [],
        [],
      );

      retval.expanded = expandedIds[retval.id] || false;

      return retval;     
    });

    for (let i=0; i<this.loadedTypes.length; i++) {
      const type = this.loadedTypes[i].name;

      this.loadedTypes[i].loadedChildren = Entry.filter(this.topic, (e: Entry): boolean=> {
        const entryType = e.type;
        return (!entryType && type===NO_TYPE_STRING) || (entryType && entryType===type) as boolean;
      })
        .map((entry: Entry): DirectoryTypeEntryNode => DirectoryTypeEntryNode.fromEntry(entry, this.loadedTypes[i]))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      this.loadedTypes[i].children = this.loadedTypes[i].loadedChildren.map((n: DirectoryTypeEntryNode) => n.id);
    }
  }
}