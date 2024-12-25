import { ValidTopic, Hierarchy, Topic } from '@/types';
import { FlagSettings } from '@/settings/DocumentFlags';

// camapaigns are journal entries, not documents
export interface WorldDoc extends Folder {}

export enum WorldFlagKey {
  isWorld = 'isWorld',    // used to mark the folder as a world
  compendiumId = 'compendiumId',   // the uuid for the world compendium 
  topicEntries = 'topicEntries',   // the JournalEntry uuid for each topic
  campaignEntries = 'campaignEntries',   // name; keyed by journal entry uuid
  types = 'types',  // object where each key is a Topic and the value is an array of valid types
  expandedIds = 'expandedIds',   // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
  expandedCampaignIds = 'expandedCampaignIds',   // ids of nodes that are expanded in the campaign tree
  hierarchies = 'hierarchies',   // the full tree hierarchy or null for topics without hierarchy
  topNodes = 'topNodes',  // array of top-level nodes 
}

export type WorldFlagType<K extends WorldFlagKey> =
  K extends WorldFlagKey.isWorld ? true :
  K extends WorldFlagKey.compendiumId ? string :
  K extends WorldFlagKey.topicEntries ? Record<ValidTopic, string> : // keyed by topic 
  K extends WorldFlagKey.campaignEntries ? Record<string, string> : // name; keyed by journal entry uuid
  K extends WorldFlagKey.types ? Record<ValidTopic, string[]> :
  K extends WorldFlagKey.expandedIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
  K extends WorldFlagKey.expandedCampaignIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
  K extends WorldFlagKey.topNodes ? Record<ValidTopic, string[]> :    // keyed by topic
  K extends WorldFlagKey.hierarchies ? Record<string, Hierarchy> :   // keyed by entry id (don't need to key by topic since entry id is unique)
  never;  

export const flagSettings = [
  {
    flagId: WorldFlagKey.isWorld,
    default: true,
  },
  {
    flagId: WorldFlagKey.compendiumId,
    default: '' as string,
  },
  {
    flagId: WorldFlagKey.topicEntries,
    default: {} as Record<Topic, string>,
  },
  {
    flagId: WorldFlagKey.campaignEntries,
    default: {} as Record<string, string>,
    keyedByUUID: true,
  },
  {
    flagId: WorldFlagKey.types,
    default: {
      [Topic.Character]: [],
      [Topic.Location]: [],
      [Topic.Event]: [],
      [Topic.Organization]: [],
    },
  },
  {
    flagId: WorldFlagKey.expandedIds,
    default: {} as Record<string, boolean | null>,
    keyedByUUID: true,
  },
  {
    flagId: WorldFlagKey.expandedCampaignIds,
    default: {} as Record<string, boolean | null>,
    keyedByUUID: true,
  },
  {
    flagId: WorldFlagKey.hierarchies,
    default: {},
    keyedByUUID: true,
  },
  {
    flagId: WorldFlagKey.topNodes,
    default: {
      [Topic.Character]: [],
      [Topic.Location]: [],
      [Topic.Event]: [],
      [Topic.Organization]: [],
    },
  },
] as FlagSettings<WorldFlagKey, {[K in WorldFlagKey]: WorldFlagType<K>}>[];

