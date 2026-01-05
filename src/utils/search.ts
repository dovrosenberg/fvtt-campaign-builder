import MiniSearch from 'minisearch';
import { Entry, Session, FCBSetting, Arc, Front } from '@/classes';
import { CustomFieldContentType, Topics, ValidTopic, } from '@/types';
import { ModuleSettings, SettingKey } from '@/settings';
import { ArcLore, SessionLore, SessionRelatedItem, SessionVignette } from '@/documents';
import { FCBJournalEntryPage } from '@/classes/Documents/FCBJournalEntryPage';
import { useMainStore } from '@/applications/stores';
import { getTopicText } from '@/compendia';

/**
 * Represents a searchable item in the index, containing all relevant search fields.
 * Used to store both entries and sessions in a unified search structure.
 */
export interface SearchableItem {
  /** Unique identifier for the item */
  uuid: string;
  /** Type of result: entry, session */
  resultType: 'entry' | 'session' | 'front' | 'arc';
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
  /** Type of result: entry, session */
  resultType: 'entry' | 'session' | 'front' | 'arc';
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
  /** Active setting id for the current search index (we only support one at a time) */
  private _activeSettingId: string | null = null;
  /** Cached UUID→name index for the active setting */
  private _entryUuidNameIndexCache: Record<string, string> = {};

  /**
   * Creates a new SearchService instance and initializes the search index.
   */
  constructor() {
    // Initialize the search index when the service is created
    this.initIndex();
  }

  /**
   * Rebuilds the UUID→name cache for the provided setting. 
   */
  private async resetCacheForSetting(setting: FCBSetting): Promise<Record<string, string>> {
    if (this._activeSettingId === setting.uuid && this._entryUuidNameIndexCache != null) {
      return this._entryUuidNameIndexCache;
    } else {
      this._activeSettingId = setting.uuid;
      this._entryUuidNameIndexCache = buildEntryUuidNameIndex(setting);
      return this._entryUuidNameIndexCache;
    }
  }

  /**
   * Removes HTML tags and replaces Entry UUID references with their display names 
   * using the cached UUID→name index.
   *
   * If a UUID label is present, it is used as-is; otherwise we look up the UUID in the cache.
   */
  private cleanDescription(text: string): string {
    if (!text || !this._entryUuidNameIndexCache)
      return text;

    // remove all HTML tags - not entirely safe because user might use <> for something
    //    but that seems like a very rare edge case (that you'd also be searching for
    //    whatever is in the brackets)
    text = text.replace(/<[^>]*>/g, '');

    // swap UUIDs for names
    return text.replace(
      /@UUID\[([^\]]+)\](?:\{([^}]+)\})?/g,
      (match, uuid: string, braceLabel: string | undefined) => {
        const label = (braceLabel ?? '').trim();
        if (label.length > 0)
          return label;

        return this._entryUuidNameIndexCache?.[uuid] ?? match;
      }
    );
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
      storeFields: ['name', 'topic', 'type', 'description', 'resultType', 'tags'],

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
          //     town itself - but less than a match for 'mayor of Smallville' in a description)
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
   * Builds the complete search index for all entries and sessions in the specified setting.
   * This is a full rebuild that replaces any existing index data.
   * 
   * @param setting - The setting containing entries and sessions to index
   * @returns A promise that resolves when the index is built
   * @throws {Error} If the search index cannot be created
   */
  public async buildIndex(setting: FCBSetting): Promise<void> {
    // always reinitialize because otherwise we'll be adding duplicates
    await this.initIndex();

    if (!this._searchIndex)
      throw new Error('Unable to create _searchIndex in SearchService.buildIndex()');

    // Collect all items first
    const items = [] as SearchableItem[];
    await this.resetCacheForSetting(setting);

    // add all the entries
    const entries = await setting.allEntries();
      
    for (const entry of entries) {
      // Create a searchable item for each entry
      items.push(await this.createSearchableItemFromEntry(entry, setting));
    }

    // add all the sessions, arcs, and fronts by campaign
    for (const campaignId in setting.campaigns) {
      const campaign = setting.campaigns[campaignId];

      if (!campaign || campaign.completed)
        continue;

      const sessions = await campaign.allSessions();
      for (const session of sessions) { 
        // Create a searchable item for each session
        const item = await this.createSearchableItemFromSession(session);
        items.push(item);
      }

      for (const index of campaign.arcIndex) { 
        const arc = await Arc.fromUuid(index.uuid);
        if (!arc) {
          // remove from the index
          campaign.arcIndex = campaign.arcIndex.filter((arc) => arc.uuid !== index.uuid);
          await campaign.save();
          continue;
        }
        
        // Create a searchable item for each arc
        const item = await this.createSearchableItemFromArc(arc!);
        items.push(item);
      }

      const fronts = await campaign.allFronts();
      for (const front of fronts) { 
        // Create a searchable item for each front
        const item = await this.createSearchableItemFromFront(front);
        items.push(item);
      }
    }

    // Add all items to the index at once for better performance
    this._searchIndex.removeAll();      
    this._searchIndex.addAll(items);

    // refresh tag results because they depend on the index
    useMainStore().refreshTagResults();
  }

  /**
   * Creates a searchable item from an entry with all relevant search fields populated.
   * Extracts relationships, hierarchy information, and other metadata for indexing.
   * 
   * @param entry - The entry to convert
   * @returns A promise that resolves to the searchable item
   */
  private async createSearchableItemFromEntry(entry: Entry, setting: FCBSetting): Promise<SearchableItem> {
    const snippets: string[] = [];
    let description = '';
    let species = '';
    let type = '';
    let topic = '';

    description = entry.description;
    species = entry.topic===Topics.Character && entry.speciesId ? ModuleSettings.get(SettingKey.speciesList)[entry.speciesId] : '';
    type = entry.type;
    topic = getTopicText(entry.topic);

    // pcs have extra field - we put it in snippets
    if (entry.topic===Topics.PC) {
      snippets.push(entry.playerName ?? '');
    }

    // custom fields get added to description so they get a higher priority than snippets
    const customFieldType = 
      entry.topic === Topics.PC ? CustomFieldContentType.PC :
      entry.topic === Topics.Character ? CustomFieldContentType.Character :
      entry.topic === Topics.Location ? CustomFieldContentType.Location :
      entry.topic === Topics.Organization ? CustomFieldContentType.Organization :
      null;

    if (customFieldType) {
      description = addCustomFieldsToDescription(description, customFieldType, entry);
    }

    // Add relationship snippets
    const relationships = entry.relationships;
    for (const topicKey in relationships) {
      const topic = parseInt(topicKey) as ValidTopic;
      const relatedEntries = relationships[topic];
      
      for (const relatedId in relatedEntries) {
        // when we remove them, we set it to null, so we need to check for that
        const related = relatedEntries[relatedId];

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
    
    const hierarchy = setting.hierarchies[entry.uuid];
    if (hierarchy) {
      const names = [] as string[];

      // Use cached entry names from topic folders 
      for (let i=0; i<hierarchy.ancestors.length; i++) {
        const ancestorUuid = hierarchy.ancestors[i];
        // Check all topic folders for this entry's name
        let ancestorName: string | undefined;
        for (const topicKey in setting.topicFolders) {
          const topicFolder = setting.topicFolders[topicKey];
          
          const ancestorEntry = topicFolder.entryIndex.find(e=>e.uuid===ancestorUuid);
          if (ancestorEntry) {
            ancestorName = ancestorEntry.name;
            break;
          }
        }
        if (ancestorName)
          names.push(ancestorName);
      }

      // do one layer of children as part of our experimenting
      // if we do this, I think we want to do it separately and weight it less than the other way
      // for (let i=0; i<hierarchy.children.length; i++) {
      //   const entry = await Entry.fromUuid(hierarchy.children[i]);
      //   if (entry)
      //     names.push(entry.name);
      // }

      if (names.length > 0)
        snippets.push(names.join('|'));
    }

    return {
      uuid: entry.uuid,
      name: entry.name,
      resultType: 'entry',
      tags: !entry.tags ? '' : entry.tags.join(', '),
      description: this.cleanDescription(description),
      topic: topic,
      species: species,
      type: type,
      relationships: snippets.join(' '),
    };
  }

  /**
   * Creates a searchable item from a session with all relevant search fields populated.
   * Extracts relationships, hierarchy information, and other metadata for indexing.
   * 
   * @param session - The session to convert
   * @returns A promise that resolves to the searchable item
   */
  private async createSearchableItemFromSession(session: Session): Promise<SearchableItem> {
    const snippets: string[] = [];
    let description = '';

    description = session.description;

  // Add snippets for related entries
    await addSessionEntrySnippet(snippets, session.locations, (uuid) => Entry.fromUuid(uuid));
    await addSessionEntrySnippet(snippets, session.npcs, (uuid) => Entry.fromUuid(uuid));
    await addSessionEntrySnippet(snippets, session.items, fromUuid);
    await addSessionEntrySnippet(snippets, session.monsters, fromUuid);

    addSessionShortSnippet(snippets, session.lore);
    addSessionShortSnippet(snippets, session.vignettes);

    // custom fields get added to description so they get a higher priority than snippets
    description = addCustomFieldsToDescription(description, CustomFieldContentType.Session, session);

    return {
      uuid: session.uuid,
      name: session.name,
      resultType: 'session',
      tags: !session.tags ? '' : session.tags.join(', '),
      description: this.cleanDescription(description),
      topic: 'session',
      species: '',
      type: '',
      relationships: snippets.join(' '),
    };
  }

  /**
   * Creates a searchable item from a session with all relevant search fields populated.
   * Extracts relationships, hierarchy information, and other metadata for indexing.
   * 
   * @param front - The front to convert
   * @returns A promise that resolves to the searchable item
   */
  private async createSearchableItemFromFront(front: Front): Promise<SearchableItem> {
    const snippets: string[] = [];
    let description = '';

    description = front.description;

    // for each danger, add some snippets
    for (const danger of front.dangers) {
      snippets.push(danger.name);
      snippets.push(danger.description);
      snippets.push(danger.impendingDoom);
      snippets.push(danger.motivation);
      snippets.push(danger.grimPortents.map(p=>p.description).join('|'));

      // add participants
      for (const participant of danger.participants) {
        const entry = await Entry.fromUuid(participant.uuid);
        if (entry)
          snippets.push(entry.name);
      }
    }

    // custom fields get added to description so they get a higher priority than snippets
    description = addCustomFieldsToDescription(description, CustomFieldContentType.Front, front);

    return {
      uuid: front.uuid,
      name: front.name,
      resultType: 'front',
      tags: !front.tags ? '' : front.tags.join(', '),
      description: this.cleanDescription(description),
      topic: 'Front',
      species: '',
      type: '',
      relationships: snippets.join(' '),
    };
  }

  /**
   * Creates a searchable item from a session with all relevant search fields populated.
   * Extracts relationships, hierarchy information, and other metadata for indexing.
   * 
   * @param arc - The arc to convert
   * @returns A promise that resolves to the searchable item
   */
  private async createSearchableItemFromArc(arc: Arc): Promise<SearchableItem> {
    const snippets: string[] = [];
    let description = '';

    description = arc.description;

    await addArcEntrySnippet(snippets, arc.locations, (uuid) => Entry.fromUuid(uuid));
    await addArcEntrySnippet(snippets, arc.participants, (uuid) => Entry.fromUuid(uuid));
    await addArcEntrySnippet(snippets, arc.monsters, fromUuid);

    addArcShortSnippet(snippets, arc.lore);

    // custom fields get added to description so they get a higher priority than snippets
    description = addCustomFieldsToDescription(description, CustomFieldContentType.Arc, arc);

    return {
      uuid: arc.uuid,
      name: arc.name,
      resultType: 'arc',
      tags: !arc.tags ? '' : arc.tags.join(', '),
      description: this.cleanDescription(description),
      topic: 'Arc',
      species: '',
      type: '',
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
  /**
   * Search for all entries that have a specific tag
   * @param tag - The tag to search for
   * @returns Array of search results with entries containing the tag
   */
  public async searchByTag(tag: string): Promise<FCBSearchResult[]> {
    if (!this._initialized || !this._searchIndex) {
      await this.initIndex();
    }
    
    if (!this._searchIndex)
      throw new Error('Couldn\'t create search index in search.addOrUpdateFrontIndex()');

    if (!tag.trim()) {
      return [];
    }
    
    // Search for the tag in the tags field using MiniSearch
    // We need to search for the exact tag, so we'll use a prefix search on tags:
    const results = this._searchIndex.search(tag, { 
      fields: ['tags'],
      prefix: false,
      fuzzy: false,
    });
        
    // Map to FCBSearchResult format
    return results.map(sr => ({
      uuid: sr.id,
      name: sr.name,
      resultType: sr.resultType,
      topic: sr.topic,
      type: sr.type,
    }));
  }

  /**
   * Search for tags that match the query (case-insensitive)
   * @param query - The search query
   * @param maxResults - Maximum number of tag results to return
   * @returns Array of matching tags with their entry counts
   */
  public async searchTags(query: string, maxResults: number = 5): Promise<Array<{tag: string, count: number}>> {
    if (!this._initialized || !this._searchIndex) {
      await this.initIndex();
      return [];
    }
    
    if (!query.trim()) {
      return [];
    }
    
    // Search across just tags field with MiniSearch
    const results = this._searchIndex.search(query, { fields: ['tags'] });

    // note: we could add tags to the result and go by that, but if an entry has 2 tags
    //    that doesn't tell us which we matched so we end up including tags that don't 
    //    match the search string
    // instead, terms contains what actually matched

    // collapse the results into a map of tag to count
    const result: Record<string, number> = results.reduce((acc, result) => {
      // we only want to match tags that look like the search string - not other random tags
      //    that happen to be on the same record
      // separate by commas
      const tags = result.tags.split(',');
      for (const tag of tags) {
        const trimmed = tag.trim();

        // do a case insensitive match of the search string into the tag
        if (trimmed.toLowerCase().includes(query.toLowerCase())) {
          acc[trimmed] = (acc[trimmed] || 0) + 1;
        }
      }
      return acc;
    }, {}); 

    return Object.keys(result)
      .map(tag => ({ tag, count: result[tag] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxResults);
  }

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
      resultType: sr.resultType,
      topic: sr.topic,
      type: sr.type,
    }));
  }

  /**
   * Adds or updates an entry in the search index.
   * If the item already exists, it will be replaced with the updated version.
   * 
   * @param entry - The entry to add or update
   * @param setting - The setting containing the entry
   * @returns A promise that resolves when the operation is complete
   */
  public async addOrUpdateEntryIndex(entry: Entry, setting: FCBSetting): Promise<void> {
    if (!this._initialized || !this._searchIndex) {
      await this.initIndex();
    }

    if (!this._searchIndex)
      throw new Error('Couldn\'t create search index in search.addOrUpdateEntryIndex()');

    // If we're indexed for a different setting, do nothing.
    // Setting changes are handled externally by calling `buildIndex()`.
    if (this._activeSettingId && this._activeSettingId !== setting.uuid)
      return;

    // Keep the UUID→name cache fresh for this setting as entries are created/renamed
    await this.resetCacheForSetting(setting);
    this._entryUuidNameIndexCache[entry.uuid] = entry.name;

    // Create and add the new searchable item
    // @ts-ignore - can't get item to type right, but this should always work
    const searchableItem = await this.createSearchableItemFromEntry(entry, setting);
    if (this._searchIndex.has(searchableItem.uuid))
      this._searchIndex.replace(searchableItem);
    else
      this._searchIndex.add(searchableItem);

    // refresh tag results because they depend on the index
    useMainStore().refreshTagResults();
  }

  /**
   * Adds or updates an entry in the search index.
   * If the item already exists, it will be replaced with the updated version.
   * 
   * @param entry - The entry to add or update
   * @returns A promise that resolves when the operation is complete
   */
  public async addOrUpdateSessionIndex(session: Session): Promise<void> {
    // don't index sessions for completed campaigns
    if (await session.isCampaignCompleted())
      return;
    
    // If we're indexed for a different setting, do nothing.
    if (!this._activeSettingId || this._activeSettingId !== session.settingId)
      return;

    if (!this._initialized || !this._searchIndex) {
      await this.initIndex();
    }
    
    if (!this._searchIndex)
      throw new Error('Couldn\'t create search index in search.addOrUpdateSessionIndex()');

    // Create and add the new searchable item
    // @ts-ignore - can't get item to type right, but this should always work
    const searchableItem = await this.createSearchableItemFromSession(session);
    if (this._searchIndex.has(searchableItem.uuid))
      this._searchIndex.replace(searchableItem);
    else
      this._searchIndex.add(searchableItem);

    // refresh tag results because they depend on the index
    useMainStore().refreshTagResults();
  }

  /**
   * Adds or updates an entry in the search index for a front.
   * If the item already exists, it will be replaced with the updated version.
   * 
   * @param front - The front to add or update
   * @returns A promise that resolves when the operation is complete
   */
  public async addOrUpdateFrontIndex(front: Front): Promise<void> {
    // don't index sessions for completed campaigns
    if (await front.isCampaignCompleted())
      return;
    
    // If we're indexed for a different setting, do nothing.
    if (!this._activeSettingId || this._activeSettingId !== front.settingId)
      return;

    if (!this._initialized || !this._searchIndex) {
      await this.initIndex();
    }
    
    if (!this._searchIndex)
      throw new Error('Couldn\'t create search index in search.addOrUpdateFrontIndex()');

    // Create and add the new searchable item
    // @ts-ignore - can't get item to type right, but this should always work
    const searchableItem = await this.createSearchableItemFromFront(front);
    if (this._searchIndex.has(searchableItem.uuid))
      this._searchIndex.replace(searchableItem);
    else
      this._searchIndex.add(searchableItem);

    // refresh tag results because they depend on the index
    useMainStore().refreshTagResults();
  }

  /**
   * Adds or updates an entry in the search index.
   * If the item already exists, it will be replaced with the updated version.
   * 
   * @param arc - The arc to add or update
   * @returns A promise that resolves when the operation is complete
   */
  public async addOrUpdateArcIndex(arc: Arc): Promise<void> {
    // don't index sessions for completed campaigns
    if (await arc.isCampaignCompleted())
      return;
    
    // If we're indexed for a different setting, do nothing.
    if (!this._activeSettingId || this._activeSettingId !== arc.settingId)
      return;

    if (!this._initialized || !this._searchIndex) {
      await this.initIndex();
    }
    
    if (!this._searchIndex)
      throw new Error('Couldn\'t create search index in search.addOrUpdateArcIndex()');

    // Create and add the new searchable item
    // @ts-ignore - can't get item to type right, but this should always work
    const searchableItem = await this.createSearchableItemFromArc(arc);
    if (this._searchIndex.has(searchableItem.uuid))
      this._searchIndex.replace(searchableItem);
    else
      this._searchIndex.add(searchableItem);

    // refresh tag results because they depend on the index
    useMainStore().refreshTagResults();
  }

  /**
   * Removes an item from the search index by UUID.
   * Safe to call even if the item doesn't exist in the index.
   * 
   * @param uuid - The UUID of the item to remove
   */
  public removeSearchEntry(uuid: string): void {
    if (!this._initialized || !this._searchIndex) {
      return;
    }
    
    // Remove from the index
    if (this._searchIndex.has(uuid))
      this._searchIndex.discard(uuid);

    // refresh tag results because they depend on the index
    useMainStore().refreshTagResults();
  }

/**
   * Retrieves all entities from the search index, filtering out duplicates by name if unique is true.
   * 
   * Used for entity linking and autocomplete functionality.
   * 
   * @param unique - If true, only "unique" entities are returned. That is names that are unique across all 
   * entries, pcs, sessions.  Why is it like this?  This is intended to be used for automatically 
   * linking entities in editors. If we can't distinguish which one it is, we don't want to assume - instead the 
   * user should insert the link manually.
   * @returns Array of unique entities with their basic information
   */
  public getAllEntities(unique = false): {name: string, uuid: string, resultType: 'entry' | 'session' | 'pc'}[] {
    if (!this._initialized || !this._searchIndex) {
      return [];
    }

    const retval: {name: string, uuid: string, resultType: 'entry' | 'session' | 'pc'}[] = [];

    // Get all documents from the search index using MiniSearch wildcard
    const MiniSearch = this._searchIndex.constructor as any;
    const allDocuments = this._searchIndex.documentCount > 0 
      ? this._searchIndex.search(MiniSearch.wildcard)
      : [];

    // Track names to detect duplicates
    const nameCount = new Map<string, number>();
    
    // First pass: count occurrences of each name
    for (const doc of allDocuments) {
      const count = nameCount.get(doc.name) || 0;
      nameCount.set(doc.name, count + 1);
    }
    
    // Second pass: only include entities with unique names if unique is true
    for (const doc of allDocuments) {
      // Skip if there are multiple entities with the same name
      if (unique && nameCount.get(doc.name)! > 1) {
        continue;
      }
      
      // Otherwise, add it
      retval.push({
        uuid: doc.id,
        name: doc.name,
        resultType: doc.resultType,
      });
    }

    return retval;
  }
}

// Add relationship snippets
// locations, npcs - entries
// items, monsters - documents
// vignettes, lore - documents
async function addSessionEntrySnippet<T extends SessionRelatedItem>(snippets: string[], relatedEntries: Readonly<T[]>, fromUuidCallback: (string)=>Promise<{name?:string | undefined} | null>) {
  for (const relatedItem of relatedEntries) {
    // only index delivered ones
    if (!relatedItem.delivered) 
      continue;

    const fullRelatedItem = await fromUuidCallback(relatedItem.uuid);
    
    if (fullRelatedItem?.name)
      snippets.push(`${fullRelatedItem?.name}`);
  }
};

// Add relationship snippets
// locations, participants - entries
// monsters - documents
// lore - documents
async function addArcEntrySnippet<T extends { uuid: string }>(snippets: string[], relatedEntries: Readonly<T[]>, fromUuidCallback: (string)=>Promise<{name?:string | undefined} | null>) {
  for (const relatedItem of relatedEntries) {
    const fullRelatedItem = await fromUuidCallback(relatedItem.uuid);
    
    if (fullRelatedItem?.name)
      snippets.push(`${fullRelatedItem?.name}`);
  }
};

// vignettes, lore
function addSessionShortSnippet(snippets: string[], relatedItems: readonly SessionLore[] | readonly SessionVignette[]) {
  for (const relatedItem of relatedItems) {
    // only index delivered ones
    if (!relatedItem.delivered) 
      continue;

    snippets.push(`${relatedItem?.description || ''}`);
  }
};

// vignettes, lore
function addArcShortSnippet(snippets: string[], relatedItems: readonly ArcLore[]) {
  for (const relatedItem of relatedItems) {
    snippets.push(`${relatedItem?.description || ''}`);
  }
};

/**
 * Appends indexed custom fields to a description string.
 * Note: UUID→name replacement is handled once at the end when building the final SearchableItem.
 */
function addCustomFieldsToDescription(
  description: string,
  contentType: CustomFieldContentType,
  item: FCBJournalEntryPage<any>,
): string {
  // custom fields get added to description so they get a higher priority than snippets
  const customFieldDefinitions = ModuleSettings.get(SettingKey.customFields)[contentType];

  if (customFieldDefinitions == null)
    throw new Error('Tried bad contentType in search.addCustomFieldsToDescription()');

  for (let i=0; i<customFieldDefinitions.length; i++) {
    if (!customFieldDefinitions[i].deleted && customFieldDefinitions[i].indexed) {
      const rawValue = item.getCustomField(customFieldDefinitions[i].name);
      const valueForIndex = typeof rawValue === 'string' ? rawValue : '';
      if (valueForIndex) {
        description += `|${valueForIndex}`;
      }
    }
  }

  return description;
}

/**
 * Builds an Entry UUID → Entry name index from the setting's topic folder entry indexes.
 * This is fast and avoids document loads.
 */
function buildEntryUuidNameIndex(setting: FCBSetting | null): Record<string, string> {
  const uuidToName = {};

  if (!setting)
    return uuidToName;

  for (const topicFolder of Object.values(setting.topicFolders)) {
    if (!topicFolder)
      continue;

    for (const entry of topicFolder.entryIndex) {
      if (entry?.uuid)
        uuidToName[entry.uuid] = entry?.name || '';
    }
  }

  return uuidToName;
}

/**
 * Singleton instance of the search service for use throughout the application.
 * Import this to access search functionality.
 */
export const searchService = new SearchService();