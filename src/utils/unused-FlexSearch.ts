// NOTE: this was a 1st attempt (not complete) at using FlexSearch.  Stopped working on it when realized it couldn't do
//    scoring or fuzzy search, which I think may be important for catching strange names.  Leaving here in case I 
//    need to come back to it, because FlexSearch is very fast
// import Flexsearch from 'flexsearch';
// import { Entry, WBWorld } from '@/classes';
// import { Topics, ValidTopic, } from '@/types';

// // Define the structure of a searchable item
// export interface SearchableItem {
//   uuid: string;
//   name: string;
//   description: string;
//   snippets: string[]; // generated from relationships and hierarchy
//   topic: string;
//   type: string;
// }

// // TODO: flexsearch doesn't support fuzzy... play with it to see if we need it

// // Create a singleton search service
// class SearchService {
//   private searchIndex: Flexsearch.Document<SearchableItem, string[]> | null = null;
//   private initialized = false;
//   private items: SearchableItem[] = [];

//   constructor() {
//     // Initialize the search index when the service is created
//     this.initIndex();
//   }

//   // TODO: Flexsearch recommends splitting by category (topic in our case) for better performance:
//   // https://emersonbottero.github.io/flexsearch/api/best-practice.html
//   // but that means you'd have to specify what you want to search... could offer the checkboxes
//   //    like we did in crossroads?

//   // TODO: !!! Flexsearch says memory usage of large ids matters a lot - 
//   // https://emersonbottero.github.io/flexsearch/api/best-practice.html
//   // is there a way to convert uuids to numbers for search purposes? I suppose as part of building the index
//   //   we could create a mapping -- it wouldn't take that much longer probably
  
//   private async initIndex() {
//     // Create a new document index with multiple fields
//     this.searchIndex = new Flexsearch.Document({
//       document: {
//         id: 'uuid',
//         index: [
//           { field: 'name', tokenize: 'forward', encode: 'soundex' }, // Prioritize name matches
//           { field: 'description', tokenize: 'forward', encode: 'soundex' },
//           // { field: 'description', tokenize: 'strict' },
//           // { field: 'description_fuzzy', tokenize: 'forward', threshold: 2 }  // could add 2nd copy of description for fuzzy and set 1st to strict
//           { field: 'snippets', tokenize: 'strict' },
//           { field: 'topic', tokenize: 'strict' },
//           { field: 'type', tokenize: 'strict' }
//         ], 
//         store: ['name', 'topic', 'type'],  // TODO: show the part of the description that matches?
//       },
//       preset: 'memory',
//       cache: false,   // may want to experiment if need for performance
//       optimize: true,
//     });

//     this.initialized = true;
//   }

//   /**
//    * Builds the search index for all entries in the world
//    * @param world The world containing entries to index
//    */
//   public async buildIndex(world: WBWorld): Promise<void> {
//     if (!this.initialized || !this.searchIndex) {
//       await this.initIndex();
//     }

//     if (!this.searchIndex)
//       throw new Error('Unable to create searchIndex in SearchService.buildIndex()');

//     // Clear existing items
//     this.items = [];
    
//     // Process each topic
//     const topics = [Topics.Character, Topics.Location, Topics.Organization] as ValidTopic[];
    
//     for (const topic of topics) {
//       const topicFolder = world.topicFolders[topic];
//       if (!topicFolder) continue;
      
//       // Get all entries for this topic
//       const entries = topicFolder.filterEntries(() => true);
      
//       for (const entry of entries) {
//         // Create a searchable item for each entry
//         const item = await this.createSearchableItem(entry, world);
//         this.items.push(item);
        
//         // Add to the search index
//         this.searchIndex.add(item);
//       }
//     }
//   }

//   /**
//    * Creates a searchable item from an entry
//    * @param entry The entry to convert
//    * @param world The world containing the entry
//    * @returns A searchable item
//    */
//   private async createSearchableItem(entry: Entry, world: WBWorld): Promise<SearchableItem> {
//     const snippets: string[] = [];
    
//     // Add relationship snippets
//     const relationships = entry.relationships;
//     for (const topicKey in relationships) {
//       const topic = parseInt(topicKey) as ValidTopic;
//       const relatedItems = relationships[topic];
      
//       for (const relatedId in relatedItems) {
//         const related = relatedItems[relatedId];
        
//         // Add the name and type
//         snippets.push(`Related to ${related.name} (${related.type})`);
        
//         // Add any extra fields
//         if (related.extraFields) {
//           for (const fieldKey in related.extraFields) {
//             const fieldValue = related.extraFields[fieldKey];
//             if (typeof fieldValue === 'string') {
//               snippets.push(`${fieldKey}: ${fieldValue}`);
//             }
//           }
//         }
//       }
//     }
    
//     // Add hierarchy snippets
//     const parentId = await entry.getParentId();
//     if (parentId) {
//       // Build the full path from the top of the tree
//       const path: string[] = [];
//       let currentId = parentId;
      
//       while (currentId) {
//         const parent = await Entry.fromUuid(currentId, entry.topicFolder);
//         if (parent) {
//           path.unshift(parent.name);
//           currentId = await parent.getParentId();
//         } else {
//           break;
//         }
//       }
      
//       if (path.length > 0) {
//         snippets.push(`Path: ${path.join(' > ')}`);
//       }
//     }
    
//     // Get children if any
//     const hierarchy = world.getEntryHierarchy(entry.uuid);
//     if (hierarchy && hierarchy.children.length > 0) {
//       const childNames: string[] = [];
      
//       for (const childId of hierarchy.children) {
//         const child = await Entry.fromUuid(childId, entry.topicFolder);
//         if (child) {
//           childNames.push(child.name);
//         }
//       }
      
//       if (childNames.length > 0) {
//         snippets.push(`Contains: ${childNames.join(', ')}`);
//       }
//     }
    
//     return {
//       uuid: entry.uuid,
//       name: entry.name,
//       description: entry.description,
//       snippets,
//       topic: Topics[entry.topic],
//       type: entry.type || 'Unknown'
//     };
//   }

//   /**
//    * Searches the index for items matching the query
//    * @param query The search query
//    * @returns An array of matching items
//    */
//   public async search(query: string): Promise<SearchableItem[]> {
//     if (!this.initialized || !this.searchIndex) {
//       await this.initIndex();
//       return [];
//     }
    
//     if (!query.trim()) {
//       return [];
//     }
    
//     // Search across all fields
//     const results = await this.searchIndex.search(query, { 
//       enrich: true, 
//       limit: 10 ,
//     });
    
//     // Flatten and deduplicate results
//     const uniqueIds = new Set<string>();
//     const items: SearchableItem[] = [];
    
//     for (const result of results) {
//       for (const item of result.result) {
//         if (!uniqueIds.has(item.id)) {
//           uniqueIds.add(item.id);
//           // Find the full item from our items array
//           const fullItem = this.items.find(i => i.uuid === item.id);
//           if (fullItem) {
//             items.push(fullItem);
//           }
//         }
//       }
//     }
    
//     return items;
//   }

//   /**
//    * Adds or updates an entry in the search index
//    * @param entry The entry to add or update
//    * @param world The world containing the entry
//    */
//   public async addOrUpdateEntry(entry: Entry, world: WBWorld): Promise<void> {
//     if (!this.initialized || !this.searchIndex) {
//       await this.initIndex();
//     }
    
//     // Remove existing entry if present
//     this.removeEntry(entry.uuid);
    
//     // Create and add the new searchable item
//     const item = await this.createSearchableItem(entry, world);
//     this.items.push(item);
//     this.searchIndex.add(item);
//   }

//   /**
//    * Removes an entry from the search index
//    * @param uuid The UUID of the entry to remove
//    */
//   public removeEntry(uuid: string): void {
//     if (!this.initialized || !this.searchIndex) {
//       return;
//     }
    
//     // Remove from the index
//     this.searchIndex.remove(uuid);
    
//     // Remove from our items array
//     this.items = this.items.filter(item => item.uuid !== uuid);
//   }
// }

// // Export a singleton instance
// export const searchService = new SearchService();