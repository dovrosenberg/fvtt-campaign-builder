import MiniSearch from 'minisearch';
import { Entry, Session, Setting } from '@/classes';
import { Topics, ValidTopic, } from '@/types';
import { ModuleSettings, SettingKey } from '@/settings';
import { SessionLore, SessionRelatedItem, SessionVignette } from '@/documents';

/**
 * Represents a searchable item in the index, containing all relevant search fields.
 * Used to store both entries and sessions in a unified search structure.
 */
export interface SearchableItem {
  /** Unique identifier for the item */
  uuid: string;
  /** Whether this item is an entry (true) or a session (false) */
  isEntry: boolean;
  /** Display name of the item */
  name: string;
  /** Comma-separated list of tags associated with the item */
  tags: string;
  /** Full description text (includes session start text for sessions) */
  description: string;   
  /** Generated from relationships and hierarchy for entries and all the links  */
  relationships: string; 
  topic: string;
  /** Species information (for character entries) */
  species: string;
  /** Type classification of the item */
  type: string;
}

/**
 * Simplified search result structure returned from search operations.
 * Contains only the essential information needed for displaying search results.
 * @private note: if memory becomes an issue could just return the uuid and look up the handful
 *    that we want to display as results
 */
export interface FCBSearchResult {
  /** Unique identifier for the result */
  uuid: string;
  /** Display name of the result */
  name: string;
  /** Whether this result is an entry (true) or a session (false) */
  isEntry: boolean;
  /** Topic/category the result belongs to */
  topic: string;

  // species: string;

  /** Type classification of the result */
  type: string;
}

/**
 * Singleton service for managing full-text search functionality across entries and sessions.
 * Provides methods to build, maintain, and search through the indexed content.
 */
class SearchService {
  /** The MiniSearch index instance */
  private _searchIndex: MiniSearch<SearchableItem> | null = null;
  /** Whether the service has been initialized */
  private _initialized = false;

  /**
   * Creates a new SearchService instance and initializes the search index.
   */
  constructor() {
    // Initialize the search index when the service is created
    this.initIndex();
  }

  /**
   * Initializes the MiniSearch index with configuration for search fields and options.
   * Sets up field weights, fuzzy matching, and other search parameters.
   * 
   * @returns A promise that resolves when initialization is complete
   */
  private async initIndex() {
    // Create a new MiniSearch instance with configuration
    this._searchIndex = new MiniSearch({
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

    this._initialized = true;
  }

  /**
   * Builds the complete search index for all entries and sessions in the specified world.
   * This is a full rebuild that replaces any existing index data.
   * 
   * @param world - The world containing entries and sessions to index
   * @returns A promise that resolves when the index is built
   * @throws {Error} If the search index cannot be created
   */
  public async buildIndex(world: Setting): Promise<void> {
    // always reinitialize because otherwise we'll be adding duplicates
    await this.initIndex();

    if (!this._searchIndex)
      throw new Error('Unable to create _searchIndex in SearchService.buildIndex()');

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
    this._searchIndex.addAll(items);
  }

  /**
   * Creates a searchable item from an entry or session with all relevant search fields populated.
   * Extracts relationships, hierarchy information, and other metadata for indexing.
   * 
   * @param item - The entry/session to convert
   * @param world - The world containing the item
   * @param isEntry - Whether the item is an entry or session
   * @returns A promise that resolves to the searchable item
   */
  private async createSearchableItem(item: Entry, world: Setting, isEntry: true): Promise<SearchableItem>;
  private async createSearchableItem(item: Session, world: Setting, isEntry: false): Promise<SearchableItem>;
  private async createSearchableItem(item: Entry | Session, world: Setting, isEntry: boolean): Promise<SearchableItem> {
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
      tags: !item.tags ? '' : item.tags.map(t=>t.value).join(', '),
      description: description,
      topic: topic,
      species: species,
      type: type,
      relationships: snippets.join(' '),
    };
  }

  /**
   * Searches the index for items matching the specified query string.
   * Uses fuzzy matching and field weighting to return the most relevant results.
   * 
   * @param query - The search query string
   * @param numResults - Maximum number of results to return
   * @returns A promise that resolves to an array of search results
   */
  public async search(query: string, numResults: number): Promise<FCBSearchResult[]> {
    if (!this._initialized || !this._searchIndex) {
      await this.initIndex();
      return [];
    }
    
    if (!query.trim()) {
      return [];
    }
    
    // Search across all fields with MiniSearch
    const results = this._searchIndex.search(query);
    
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
   * Adds or updates an entry in the search index.
   * If the item already exists, it will be replaced with the updated version.
   * 
   * @param item - The entry or session to add or update
   * @param world - The world containing the entry
   * @param isEntry - Whether the item is an entry or session
   * @returns A promise that resolves when the operation is complete
   */
  public async addOrUpdateIndex(entry: Entry, world: Setting, isEntry: true): Promise<void>; 
  public async addOrUpdateIndex(entry: Session, world: Setting, isEntry: false): Promise<void>;
  public async addOrUpdateIndex(item: Entry | Session, world: Setting, isEntry: boolean): Promise<void> {
    if (!this._initialized || !this._searchIndex) {
      await this.initIndex();
    }
    
    if (!this._searchIndex)
      throw new Error('Couldn\'t create search index in search.addOrUpdateIndex()');

    // Create and add the new searchable item
    // @ts-ignore - can't get item to type right, but this should always work
    const searchableItem = await this.createSearchableItem(item, world, isEntry);
    if (this._searchIndex.has(searchableItem.uuid))
      this._searchIndex.replace(searchableItem);
    else
      this._searchIndex.add(searchableItem);
  }

  /**
   * Removes an item from the search index by UUID.
   * Safe to call even if the item doesn't exist in the index.
   * 
   * @param uuid - The UUID of the item to remove
   */
  public removeEntry(uuid: string): void {
    if (!this._initialized || !this._searchIndex) {
      return;
    }
    
    // Remove from the index
    if (this._searchIndex.has(uuid))
      this._searchIndex.discard(uuid);
  }

  /**
   * Retrieves all entities from the search index, filtering out duplicates by name.
   * When multiple entities have the same name, entries are preferred over sessions.
   * Used for entity linking and autocomplete functionality.
   * 
   * @returns Array of unique entities with their basic information
   */
  public getAllEntities(): {name: string, uuid: string, isEntry: boolean}[] {
    if (!this._initialized || !this._searchIndex) {
      return [];
    }

    // Get all documents from the search index using MiniSearch wildcard
    const MiniSearch = this._searchIndex.constructor as any;
    const allDocuments = this._searchIndex.documentCount > 0 
      ? this._searchIndex.search(MiniSearch.wildcard)
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

/**
 * Singleton instance of the search service for use throughout the application.
 * Import this to access search functionality.
 */
export const searchService = new SearchService();