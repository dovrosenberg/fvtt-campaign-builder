import { ValidTopic, Hierarchy } from '@/types';

// camapaigns are journal entries, not documents
export interface WorldDoc extends Folder {}

export namespace WorldDoc {
  export enum FlagKey {
    worldCompendium = 'worldCompendium',   // the uuid for the world compendium 
    topicEntries = 'topicEntries',   // the JournalEntry uuid for each topic
    campaignEntries = 'campaignEntries',   // name; keyed by journal entry uuid
    types = 'types',  // object where each key is a Topic and the value is an array of valid types
    expandedIds = 'expandedIds',   // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
    expandedCampaignIds = 'expandedCampaignIds',   // ids of nodes that are expanded in the campaign tree
    hierarchies = 'hierarchies',   // the full tree hierarchy or null for topics without hierarchy
    topNodes = 'topNodes',  // array of top-level nodes 
  }
  
  export type FlagType<K extends WorldDoc.FlagKey> =
    K extends WorldDoc.FlagKey.worldCompendium ? string :
    K extends WorldDoc.FlagKey.topicEntries ? Record<ValidTopic, string> : // keyed by topic 
    K extends WorldDoc.FlagKey.campaignEntries ? Record<string, string> : // name; keyed by journal entry uuid
    K extends WorldDoc.FlagKey.types ? Record<ValidTopic, string[]> :
    K extends WorldDoc.FlagKey.expandedIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
    K extends WorldDoc.FlagKey.expandedCampaignIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
    K extends WorldDoc.FlagKey.topNodes ? Record<ValidTopic, string[]> :    // keyed by topic
    K extends WorldDoc.FlagKey.hierarchies ? Record<string, Hierarchy> :   // keyed by entry id (don't need to key by topic since entry id is unique)
    never;  
}