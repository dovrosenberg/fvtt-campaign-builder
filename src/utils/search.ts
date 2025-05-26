import MiniSearch from 'minisearch';
import { Entry, Session, WBWorld } from '@/classes';
import { Topics, ValidTopic, } from '@/types';
import { ModuleSettings, SettingKey } from '@/settings';
import { SessionLore, SessionRelatedItem, SessionVignette } from '@/documents';

// Define the structure of a searchable item
export interface SearchableItem {
  uuid: string;
  isEntry: boolean;  // is it an entry or a session
  name: string;
  tags: string;
  description: string;   // includes "start" from sessions
  relationships: string; // generated from relationships and hierarchy for entries and all the links for sessions
  topic: string;
  species: string;
  type: string;
}

// note: if memory becomes an issue could just return the uuid and look up the handful
//    that we want to display as results
export interface FCBSearchResult {
  uuid: string;
  name: string;
  isEntry: boolean;  // is it an entry or a session
  // description: string;
  topic: string;
  // species: string;
  type: string;
}

// Create a singleton search service
class SearchService {
  private searchIndex: MiniSearch<SearchableItem> | null = null;
  private initialized = false;

  constructor() {
    // Initialize the search index when the service is created
    this.initIndex();
  }

  private async initIndex() {
    // Create a new MiniSearch instance with configuration
    this.searchIndex = new MiniSearch({
      idField: 'uuid',

      // Fields to index for searching
      fields: ['name', 'tags', 'description', 'relationships', 'topic', 'type', 'species'],

      // Fields to include in search results
      storeFields: ['name', 'topic', 'type', 'description', 'isEntry'],

      searchOptions: {
        boost: { 
          name: 5,  // Prioritize name matches
          tag: 5, // Prioritize tag matches
          description: 2,
          topic: 1, 
          type: 2,
          species: 2,
          // TODO: we could also include descriptions of the related entities with a lower score?
          // we make this high because if we match on the related record and the role, for ex.
          //    then the relationship should score higher than just a match on name (that way
          //    "mayor of Smallville" will match on the person that's the mayor higher than the
          //     town itself - but less than a match for 'mayor of smallville' in a description)
          relationships: 3   
        }, 
        fuzzy: 0.2, // Enable fuzzy matching (20% of term length)
        maxFuzzy: 4,
        prefix: true, // Enable prefix matching
      },
      
      autoVacuum: { minDirtCount: 5},
    });

    this.initialized = true;
  }

  /**
   * Builds the search index for all entries in the world
   * @param world The world containing entries to index
   */
  public async buildIndex(world: WBWorld): Promise<void> {
    // always reinitialize because otherwise we'll be adding duplicates
    await this.initIndex();

    if (!this.searchIndex)
      throw new Error('Unable to create searchIndex in SearchService.buildIndex()');

    // Process each topic
    const topics = [Topics.Character, Topics.Location, Topics.Organization] as ValidTopic[];
    
    // Collect all items first
    const items = [] as SearchableItem[];

    // add all the entries, by topic
    for (const topic of topics) {
      const topicFolder = world.topicFolders[topic];
      if (!topicFolder) continue;
      
      // Get all entries for this topic
      const entries = topicFolder.filterEntries(() => true);
      
      for (const entry of entries) {
        // Create a searchable item for each entry
        const item = await this.createSearchableItem(entry, world, true);
        items.push(item);
      }
    }

    // add all the sessions, by campaign
    for (const campaignId in world.campaigns) {
      const campaign = world.campaigns[campaignId];
      for (const session of campaign.sessions) { 
        // Create a searchable item for each session
        const item = await this.createSearchableItem(session, world, false);
        items.push(item);
      }
    }
    
    // Add all items to the index at once for better performance
    this.searchIndex.addAll(items);
  }

  /**
   * Creates a searchable item from an entry
   * @param item The entry/Session to convert
   * @param world The world containing the entry
   * @param isEntry Whether the entry is an entry or a session
   * @returns A searchable item
   */
  private async createSearchableItem(item: Entry, world: WBWorld, isEntry: true): Promise<SearchableItem>;
  private async createSearchableItem(item: Session, world: WBWorld, isEntry: false): Promise<SearchableItem>;
  private async createSearchableItem(item: Entry | Session, world: WBWorld, isEntry: boolean): Promise<SearchableItem> {
    const snippets: string[] = [];
    let description = '';
    let species = '';
    let type = '';
    let topic = '';

    if (isEntry) {
      const entry = item as Entry;
      description = entry.description;
      species = entry.topic===Topics.Character && entry.speciesId ? ModuleSettings.get(SettingKey.speciesList)[entry.speciesId] : '';
      type = entry.type;
      topic = Topics[entry.topic];


      // Add relationship snippets
      const relationships = entry.relationships;
      for (const topicKey in relationships) {
        const topic = parseInt(topicKey) as ValidTopic;
        const relatedItems = relationships[topic];
        
        for (const relatedId in relatedItems) {
          // when we remove them, we set it to null, so we need to check for that
          const related = relatedItems[relatedId];

          if (!related)
            continue;

          let relationSnippet = `${related.name}|`;

          // Add any extra fields
          if (related.extraFields) {
            for (const fieldKey in related.extraFields) {
              const fieldValue = related.extraFields[fieldKey];
              if (typeof fieldValue === 'string') {
                relationSnippet += `${fieldKey}: ${fieldValue}|`
              }
            }
          }
          snippets.push(relationSnippet);
        }
      }
      
      // Add hierarchy snippets
      // Build the full path from the top of the tree - we don't actually care about the order so we can just 
      //   do all the ancestors; this will prevent us matching "child" when searching for "parent" but that's 
      //   probably OK?  Let's try it for a while before changing
      // TODO: note this ^^^
      
      const hierarchy = world.hierarchies[entry.uuid];
      if (hierarchy) {
        const names = [] as string[];

        for (let i=0; i<hierarchy.ancestors.length; i++) {
          const entry = await Entry.fromUuid(hierarchy.ancestors[i]);
          if (entry)
            names.push(entry.name);
        }

        // do one layer of children as part of our experimenting
        // if we do this, I think we want to do it separately and weight it less than the other way
        // for (let i=0; i<hierarchy.children.length; i++) {
        //   const entry = await Entry.fromUuid(hierarchy.children[i]);
        //   if (entry)
        //     names.push(entry.name);
        // }

        snippets.push(names.join('|'));
      }
    } else {
      const session = item as Session;
      description = session.notes + '|' + session.startingAction;
      topic = 'session';

      // Add relationship snippets
      // locations, npcs - entries
      // items, monsters - documents
      // vignettes, lore - documents
      const addEntrySnippet = async <T extends SessionRelatedItem>(relatedEntries: Readonly<T[]>, fromUuidCallback: (string)=>Promise<{name?:string | undefined} | null>) => {
        for (const relatedItem of relatedEntries) {
          // only index delivered ones
          if (!relatedItem.delivered) 
            continue;

          const fullRelatedItem = await fromUuidCallback(relatedItem.uuid);
          
          if (fullRelatedItem?.name)
            snippets.push(`${fullRelatedItem?.name}`);
        }
      };
      await addEntrySnippet(session.locations, Entry.fromUuid);
      await addEntrySnippet(session.npcs, Entry.fromUuid);
      await addEntrySnippet(session.items, fromUuid);
      await addEntrySnippet(session.monsters, fromUuid);

      // vignettes, lore
      const addShortSnippet = async (relatedEntries: readonly SessionLore[] | readonly SessionVignette[]) => {
        for (const relatedItem of relatedEntries) {
          // only index delivered ones
          if (!relatedItem.delivered) 
            continue;

          snippets.push(`${relatedItem?.description}`);
        }
      };
      await addShortSnippet(session.lore);
      await addShortSnippet(session.vignettes);
    }

    return {
      uuid: item.uuid,
      name: item.name,
      isEntry: isEntry,
      tags: item.tags.map(t=>t.value).join(', '),
      description: description,
      topic: topic,
      species: species,
      type: type,
      relationships: snippets.join(' '),
    };
  }

  /**
   * Searches the index for items matching the query
   * @param query The search query
   * @returns An array of matching items
   */
  public async search(query: string, numResults: number): Promise<FCBSearchResult[]> {
    if (!this.initialized || !this.searchIndex) {
      await this.initIndex();
      return [];
    }
    
    if (!query.trim()) {
      return [];
    }
    
    // Search across all fields with MiniSearch
    const results = this.searchIndex.search(query);
    
    // Limit to 10 results
    // Results from MiniSearch already include the stored fields
    return results.slice(0, numResults).map(sr => ({
      uuid: sr.id,
      name: sr.name,
      isEntry: sr.isEntry,
      topic: sr.topic,
      type: sr.type,
    }));
  }

  /**
   * Adds or updates an entry/sexxion in the search index
   * @param entry The entry/session to add or update
   * @param world The world containing the entry
   * @param isEntry Whether the entry is an entry or a session
   */
  public async addOrUpdateIndex(entry: Entry, world: WBWorld, isEntry: true): Promise<void>; 
  public async addOrUpdateIndex(entry: Session, world: WBWorld, isEntry: false): Promise<void>;
  public async addOrUpdateIndex(item: Entry | Session, world: WBWorld, isEntry: boolean): Promise<void> {
    if (!this.initialized || !this.searchIndex) {
      await this.initIndex();
    }
    
    if (!this.searchIndex)
      throw new Error('Couldn\'t create search index in search.addOrUpdateIndex()');

    // Create and add the new searchable item
    // @ts-ignore - can't get item to type right, but this should always work
    const searchableItem = await this.createSearchableItem(item, world, isEntry);
    if (this.searchIndex.has(searchableItem.uuid))
      this.searchIndex.replace(searchableItem);
    else
      this.searchIndex.add(searchableItem);
  }

  /**
   * Removes an entry from the search index
   * @param uuid The UUID of the entry to remove
   */
  public removeEntry(uuid: string): void {
    if (!this.initialized || !this.searchIndex) {
      return;
    }
    
    // Remove from the index
    if (this.searchIndex.has(uuid))
      this.searchIndex.discard(uuid);
  }

  /**
   * Gets all entities from the search index, excluding duplicates by name
   * @returns Array of all searchable entities with unique names
   */
  public getAllEntities(): {name: string, uuid: string, isEntry: boolean}[] {
    if (!this.initialized || !this.searchIndex) {
      return [];
    }

    // Get all documents from the search index using MiniSearch wildcard
    const MiniSearch = this.searchIndex.constructor as any;
    const allDocuments = this.searchIndex.documentCount > 0 
      ? this.searchIndex.search(MiniSearch.wildcard)
      : [];

    // Track names to detect duplicates
    const nameCount = new Map<string, number>();
    const entityMap = new Map<string, {name: string, uuid: string, isEntry: boolean}>();
    
    // First pass: count occurrences of each name
    for (const doc of allDocuments) {
      const count = nameCount.get(doc.name) || 0;
      nameCount.set(doc.name, count + 1);
    }
    
    // Second pass: only include entities with unique names
    for (const doc of allDocuments) {
      // Skip if there are multiple entities with the same name
      if (nameCount.get(doc.name)! > 1) {
        continue;
      }
      
      const existing = entityMap.get(doc.name);
      
      // Add if not exists, or replace if current is an entry and existing is not
      if (!existing || (doc.isEntry && !existing.isEntry)) {
        entityMap.set(doc.name, {
          uuid: doc.id,
          name: doc.name,
          isEntry: doc.isEntry,
        });
      }
    }

    // Convert Map values to array
    return Array.from(entityMap.values());
  }
}

// Export a singleton instance
export const searchService = new SearchService();