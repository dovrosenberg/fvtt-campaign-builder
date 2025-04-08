import MiniSearch from 'minisearch';
import { Entry, WBWorld } from '@/classes';
import { Topics, ValidTopic, } from '@/types';
import { ModuleSettings, SettingKey } from '@/settings';

// Define the structure of a searchable item
export interface SearchableItem {
  uuid: string;
  name: string;
  description: string;
  relationships: string; // generated from relationships and hierarchy
  topic: string;
  species: string;
  type: string;
}

// note: if memory becomes an issue could just return the uuid and look up the handful
//    that we want to display as results
export interface FCBSearchResult {
  uuid: string;
  name: string;
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
      fields: ['name', 'description', 'relationships', 'topic', 'type', 'species'],

      // Fields to include in search results
      storeFields: ['name', 'topic', 'type', 'description'],

      searchOptions: {
        boost: { 
          name: 6,  // Prioritize name matches
          description: 4,
          topic: 2, 
          type: 2,
          species: 2,
          relationships: 1,   // TODO: we could also include descriptions of the related entities with a lower score?
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
    if (!this.initialized || !this.searchIndex) {
      await this.initIndex();
    }

    if (!this.searchIndex)
      throw new Error('Unable to create searchIndex in SearchService.buildIndex()');

    // Process each topic
    const topics = [Topics.Character, Topics.Event, Topics.Location, Topics.Organization] as ValidTopic[];
    
    // Collect all items first
    const items = [] as SearchableItem[];
    for (const topic of topics) {
      const topicFolder = world.topicFolders[topic];
      if (!topicFolder) continue;
      
      // Get all entries for this topic
      const entries = topicFolder.filterEntries(() => true);
      
      for (const entry of entries) {
        // Create a searchable item for each entry
        const item = await this.createSearchableItem(entry, world);
        items.push(item);
      }
    }
    
    // Add all items to the index at once for better performance
    this.searchIndex.addAll(items);
  }

  /**
   * Creates a searchable item from an entry
   * @param entry The entry to convert
   * @param world The world containing the entry
   * @returns A searchable item
   */
  private async createSearchableItem(entry: Entry, world: WBWorld): Promise<SearchableItem> {
    const snippets: string[] = [];
    
    // Add relationship snippets
    const relationships = entry.relationships;
    for (const topicKey in relationships) {
      const topic = parseInt(topicKey) as ValidTopic;
      const relatedItems = relationships[topic];
      
      for (const relatedId in relatedItems) {
        const related = relatedItems[relatedId];
        
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

    return {
      uuid: entry.uuid,
      name: entry.name,
      description: entry.description,
      topic: Topics[entry.topic],
      species: entry.topic===Topics.Character && entry.speciesId ? ModuleSettings.get(SettingKey.speciesList)[entry.speciesId] : '',
      type: entry.type || '',
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
      topic: sr.topic,
      type: sr.type,
    }));
  }

  /**
   * Adds or updates an entry in the search index
   * @param entry The entry to add or update
   * @param world The world containing the entry
   */
  public async addOrUpdateEntry(entry: Entry, world: WBWorld): Promise<void> {
    if (!this.initialized || !this.searchIndex) {
      await this.initIndex();
    }
    
    if (!this.searchIndex)
      throw new Error('Couldn\'t create search index in search.addOrUpdateEntry()');

    // Remove existing entry if present
    this.removeEntry(entry.uuid);
    
    // Create and add the new searchable item
    const item = await this.createSearchableItem(entry, world);
    this.searchIndex.add(item);
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
    this.searchIndex.discard(uuid);

    // TODO - need to vacuum the index periodically
  }
}

// Export a singleton instance
export const searchService = new SearchService();