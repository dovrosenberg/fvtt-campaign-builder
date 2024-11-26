import { ValidTopic, } from '@/types';
import { CollapsibleNode, DirectoryEntryNode, DirectoryTypeNode, DirectoryTypeEntryNode } from '@/classes';
import { Entry } from '@/documents';
import { NO_NAME_STRING, NO_TYPE_STRING } from '@/utils/hierarchy';

export class DirectoryTopicNode extends CollapsibleNode{
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
  public async loadTypeEntries (currentTopicJournals: JournalEntry[], types: string [], expandedIds: Record<string, boolean | null>): Promise<void> {
    // this is relatively fast for now, so we just load them all... otherwise, we need a way to index the entries by 
    //    type on the journalentry, or pack or world, which is a lot of extra data (or consider a special subtype of Journal Entry with a type field in the data model
    //    that is also in the index)
    if (!currentTopicJournals)
      return;

    const allEntries = await currentTopicJournals[this.topic].collections.pages.contents as Entry[];

    // create the loadedType nodes then populate their children
    this.loadedTypes = types.map((type: string): DirectoryTypeNode => new DirectoryTypeNode(
      this.id + ':' + type,
      type,
      this.topic,
      [],
      [],
      expandedIds[this.id + ':' + type] || false,   
    ));

    for (let i=0; i<this.loadedTypes.length; i++) {
      const type = this.loadedTypes[i].name;

      this.loadedTypes[i].children = allEntries.filter((e: Entry)=> {
        const entryType = e.system.type;
        return (!entryType && type===NO_TYPE_STRING) || (entryType && entryType===type);
      }).map((entry: Entry): DirectoryTypeEntryNode=> new DirectoryTypeEntryNode(
        entry.uuid,
        this.topic,
        entry.name || NO_NAME_STRING,
        this.id + ':' + type,
      )).sort((a, b) => a.name.localeCompare(b.name));
      this.loadedTypes[i].loadedChildren = this.loadedTypes[i].children;
    }
  }
}