import { ValidTopic, Hierarchy, Topics } from '@/types';
import { FlagSettings } from '@/settings/DocumentFlags';

// camapaigns are journal entries, not documents
export interface WorldDoc extends Folder {}

export enum WorldFlagKey {
  isWorld = 'isWorld',    // used to mark the folder as a world
  compendiumId = 'compendiumId',   // the uuid for the world compendium 
  topicIds = 'topicIds',   // the uuid for each topic
  campaignEntries = 'campaignEntries',   // name of each campaign; keyed by journal entry uuid
  expandedIds = 'expandedIds',   // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
  hierarchies = 'hierarchies',   // the full tree hierarchy or null for topics without hierarchy
}

export type WorldFlagType<K extends WorldFlagKey> =
  K extends WorldFlagKey.isWorld ? true :
  K extends WorldFlagKey.compendiumId ? string :
  K extends WorldFlagKey.topicIds ? Record<ValidTopic, string> : // keyed by topic 
  K extends WorldFlagKey.campaignEntries ? Record<string, string> : // name; keyed by journal entry uuid
  K extends WorldFlagKey.expandedIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
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
    flagId: WorldFlagKey.topicIds,
    default: {} as Record<Topics, string>,
  },
  {
    flagId: WorldFlagKey.campaignEntries,
    default: {} as Record<string, string>,
    keyedByUUID: true,
  },
  {
    flagId: WorldFlagKey.expandedIds,
    default: {} as Record<string, boolean | null>,
    keyedByUUID: true,
  },
  {
    flagId: WorldFlagKey.hierarchies,
    default: {},
    keyedByUUID: true,
  },
] as FlagSettings<WorldFlagKey, {[K in WorldFlagKey]: WorldFlagType<K>}>[];

