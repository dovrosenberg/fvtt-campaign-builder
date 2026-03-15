/* 
 * An node representing a topic in the topic tree structures
 */

import { TopicFolder, DirectoryTopicTreeNode, DirectoryEntryNode, DirectoryTypeNode, DirectoryTypeEntryNode, } from '@/classes';
import { NO_TYPE_STRING } from '@/utils/hierarchy';
import { EntryBasicIndex } from '@/types';

export class DirectoryTopicFolderNode extends DirectoryTopicTreeNode {
  name: string;
  loadedTypes: DirectoryTypeNode[];
  
  // children are for the entries; loadedTypes is for the type nodes
  constructor(id: string, name: string, topicFolder: TopicFolder, 
    children: string[] = [], loadedChildren: DirectoryEntryNode[] = [], 
    loadedTypes: DirectoryTypeNode[] = [], expanded: boolean = false
  ) {

    super(id, topicFolder, expanded, null, children, loadedChildren, []);

    this.name = name;
    this.loadedTypes = loadedTypes;
  }

  /**
   * This function is used to load all of the type entries for a particular topic.
   * @param types the types for this topic
   * @param expandedIds the ids that are currently expanded
   * @returns a promise that resolves when the entries are loaded
   */
  public loadTypeEntries (types: string [], expandedIds: Record<string, boolean | null>): void {
    // this is relatively fast for now, so we just load them all... otherwise, we need a way to index the entries by 
    //    type on the journalentry, or pack or setting, which is a lot of extra data (or consider a special subtype of Journal Entry with a type field in the data model
    //    that is also in the index)

    // Determine if there are any entries without a type. If so, ensure we create a '(none)' grouping.
    // We only add the '(none)' node when it is actually needed.
    const hasNoTypeEntries = (this.topicFolder.entryIndex.find((e: EntryBasicIndex) => !e.type)) !== undefined;
    const typesToUse = hasNoTypeEntries && !types.includes(NO_TYPE_STRING) ? types.concat([NO_TYPE_STRING]) : types;

    // create the loadedType nodes then populate their children
    this.loadedTypes = typesToUse.map((type: string): DirectoryTypeNode => {
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

      // For the '(none)' group, include entries whose type is actually empty/undefined.
      // For all other groups, match on the literal type string.
      // Exclude branches - they should only appear in the Branches folder.
      const loadedChildren = this.topicFolder.entryIndex.filter((e: EntryBasicIndex): boolean =>
        (type === NO_TYPE_STRING ? (e.type === type || !e.type) : e.type === type) &&
        !e.isBranch
      );

      let loadedChildrenNodes = [] as DirectoryTypeEntryNode[];
      for (const index of loadedChildren) {
        loadedChildrenNodes.push(DirectoryTypeEntryNode.fromEntryBasicIndex({uuid: index.uuid, name: index.name, type: index.type}, this.loadedTypes[i]));
      }
      
      loadedChildrenNodes = loadedChildrenNodes.sort((a, b) => a.name.localeCompare(b.name));
      
      this.loadedTypes[i].loadedChildren = loadedChildrenNodes;
      this.loadedTypes[i].children = this.loadedTypes[i].loadedChildren.map((n: DirectoryTypeEntryNode) => n.id);
    }
  }
}