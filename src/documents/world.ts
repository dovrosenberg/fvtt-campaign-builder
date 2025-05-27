import { ValidTopic, Hierarchy, WorldGeneratorConfig } from '@/types';
import { FlagSettings } from '@/settings/DocumentFlags';

// campaigns are journal entries, not documents
export interface WorldDoc extends Folder {
  __type: 'WorldDoc';
}

export enum WorldFlagKey {
  isWorld = 'isWorld',    // used to mark the folder as a world
  compendiumId = 'compendiumId',   // the uuid for the world compendium
  topicIds = 'topicIds',   // the uuid for each topic
  campaignNames = 'campaignNames',   // name of each campaign; keyed by journal entry uuid
  expandedIds = 'expandedIds',   // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
  hierarchies = 'hierarchies',   // the full tree hierarchy or null for topics without hierarchy
  genre = 'genre',
  worldFeeling = 'worldFeeling',
  description = 'description',
  img = 'img',   // image path for the world
  nameStyles = 'nameStyles',   // array of name styles to use for name generation
  rollTableConfig = 'rollTableConfig',   // world-specific roll table configuration
}

export type WorldFlagType<K extends WorldFlagKey> =
  K extends WorldFlagKey.isWorld ? true :
  K extends WorldFlagKey.compendiumId ? string :
  K extends WorldFlagKey.topicIds ? Record<ValidTopic, string> | null: // keyed by topic
  K extends WorldFlagKey.campaignNames ? Record<string, string> : // name; keyed by journal entry uuid
  K extends WorldFlagKey.expandedIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
  K extends WorldFlagKey.hierarchies ? Record<string, Hierarchy> :   // keyed by entry id (don't need to key by topic since entry id is unique)
  K extends WorldFlagKey.genre ? string :
  K extends WorldFlagKey.worldFeeling ? string :
  K extends WorldFlagKey.description ? string :
  K extends WorldFlagKey.img ? string :
  K extends WorldFlagKey.nameStyles ? number[] :
  K extends WorldFlagKey.rollTableConfig ? WorldGeneratorConfig | null :
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
    default: null,
  },
  {
    flagId: WorldFlagKey.campaignNames,
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
  {
    flagId: WorldFlagKey.worldFeeling,
    default: '',
  },
  {
    flagId: WorldFlagKey.genre,
    default: '',
  },
  {
    flagId: WorldFlagKey.description,
    default: '' as string,
  },
  {
    flagId: WorldFlagKey.img,
    default: '' as string,
  },
  {
    flagId: WorldFlagKey.nameStyles,
    default: [0, 1, 2, 3, 4] as number[],
  },
  {
    flagId: WorldFlagKey.rollTableConfig,
    default: null as WorldGeneratorConfig | null,
  },
] as FlagSettings<WorldFlagKey, {[K in WorldFlagKey]: WorldFlagType<K>}>[];

