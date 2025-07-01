import { ValidTopic, Hierarchy, SettingGeneratorConfig, RelatedJournal } from '@/types';
import { FlagSettings } from '@/settings/DocumentFlags';
import { ApiNamePreviewPost200ResponsePreviewInner } from '@/apiClient';

// campaigns are journal entries, not documents
export interface SettingDoc extends Folder {
  __type: 'SettingDoc';
}

export enum SettingFlagKey {
  isSetting = 'isWorld',    // used to mark the folder as a setting; didn't replace as setting for compatibility
  compendiumId = 'compendiumId',   // the uuid for the setting compendium
  topicIds = 'topicIds',   // the uuid for each topic
  campaignNames = 'campaignNames',   // name of each campaign; keyed by journal entry uuid
  expandedIds = 'expandedIds',   // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
  hierarchies = 'hierarchies',   // the full tree hierarchy or null for topics without hierarchy
  genre = 'genre',
  settingFeeling = 'worldFeeling', // leaving the key value for backwards compatibility
  description = 'description',
  img = 'img',   // image path for the setting
  nameStyles = 'nameStyles',   // array of name styles to use for name generation
  rollTableConfig = 'rollTableConfig',   // setting-specific roll table configuration
  nameStyleExamples = 'nameStyleExamples',   // stored example names for each style with their genre and setting feeling
  journals = 'journals',
}

export type SettingFlagType<K extends SettingFlagKey> =
  K extends SettingFlagKey.isSetting ? true :
  K extends SettingFlagKey.compendiumId ? string :
  K extends SettingFlagKey.topicIds ? Record<ValidTopic, string> | null: // keyed by topic
  K extends SettingFlagKey.campaignNames ? Record<string, string> : // name; keyed by journal entry uuid
  K extends SettingFlagKey.expandedIds ? Record<string, boolean | null> :  // keyed by uuid (id for compendium); can be false or missing to represent false; we allow null only because of the strange foundry syntax for removing a key
  K extends SettingFlagKey.hierarchies ? Record<string, Hierarchy> :   // keyed by entry id (don't need to key by topic since entry id is unique)
  K extends SettingFlagKey.genre ? string :
  K extends SettingFlagKey.settingFeeling ? string :
  K extends SettingFlagKey.description ? string :
  K extends SettingFlagKey.img ? string :
  K extends SettingFlagKey.nameStyles ? number[] :
  K extends SettingFlagKey.rollTableConfig ? SettingGeneratorConfig | null :
  K extends SettingFlagKey.nameStyleExamples ? { genre: string; settingFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null :
  K extends SettingFlagKey.journals ? RelatedJournal[] :
  never;

export const flagSettings = [
  {
    flagId: SettingFlagKey.isSetting,
    default: true,
  },
  {
    flagId: SettingFlagKey.compendiumId,
    default: '' as string,
  },
  {
    flagId: SettingFlagKey.topicIds,
    default: null,
  },
  {
    flagId: SettingFlagKey.campaignNames,
    default: {} as Record<string, string>,
    keyedByUUID: true,
  },
  {
    flagId: SettingFlagKey.expandedIds,
    default: {} as Record<string, boolean | null>,
    keyedByUUID: true,
  },
  {
    flagId: SettingFlagKey.hierarchies,
    default: {},
    keyedByUUID: true,
  },
  {
    flagId: SettingFlagKey.settingFeeling,
    default: '',
  },
  {
    flagId: SettingFlagKey.genre,
    default: '',
  },
  {
    flagId: SettingFlagKey.description,
    default: '' as string,
  },
  {
    flagId: SettingFlagKey.img,
    default: '' as string,
  },
  {
    flagId: SettingFlagKey.nameStyles,
    default: [0, 1, 2, 3, 4] as number[],
  },
  {
    flagId: SettingFlagKey.rollTableConfig,
    default: null as SettingGeneratorConfig | null,
  },
  {
    flagId: SettingFlagKey.nameStyleExamples,
    default: null as { genre: string; settingFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null,
  },
  {
    flagId: SettingFlagKey.journals,
    default: [] as RelatedJournal[],
  },
] as FlagSettings<SettingFlagKey, {[K in SettingFlagKey]: SettingFlagType<K>}>[];

