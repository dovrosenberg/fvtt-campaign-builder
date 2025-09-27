import { ValidTopic, Hierarchy, SettingGeneratorConfig, RelatedJournal } from '@/types';
import { ApiNamePreviewPost200ResponsePreviewInner } from '@/apiClient';

export interface SettingDoc {
  name: string;  // the name of the setting
  topicIds: Record<ValidTopic, string> | Record<never, string>;  // the uuid for each topic
  campaignNames: Record<string, string>;  // name of each campaign; keyed by journal entry uuid
  expandedIds: Record<string, boolean>;  // ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree
  hierarchies: Record<string, Hierarchy>;  // the full tree hierarchy or null for topics without hierarchy
  genre: string;  // genre of the setting
  settingFeeling: string;  // setting feeling of the setting
  description: string;  // description of the setting
  img: string;  // image path for the setting
  nameStyles: number[];  // array of name styles to use for name generation
  rollTableConfig: SettingGeneratorConfig | null;  // setting-specific roll table configuration
  nameStyleExamples: { genre: string; settingFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null;  // stored example names for each style with their genre and setting feeling
  journals: RelatedJournal[];  // related journal entries
}