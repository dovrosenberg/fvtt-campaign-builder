// can't use the one from settings because it won't be initialized yet
import { id as moduleId } from '@module';
import { EntryDataModel } from './entry';
import { SessionDataModel } from './session';
import { SettingDataModel } from './fcbSetting';
import { CampaignDataModel } from './campaign';

// only need these for things that are actually subtyped
// JournalEntry can't be subtyped, so we handle campaign (and TopicFolder) differently
// For PCs, we don't want to subtype Actor because we want to be able to attach to the 
//    same actor documents used by the system
export const DOCUMENT_TYPES = {
  Entry: `${moduleId}.entry` as const,
  Session: `${moduleId}.session` as const,
  Setting: `${moduleId}.setting` as const,
  Campaign: `${moduleId}.campaign` as const,
  PC: `${moduleId}.pc` as const,   // here for compatibility, but no longer used
} as const;

export type FCB_DOCUMENT_TYPES = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

export type JournalEntryPageTypes = 
  { [K in (typeof DOCUMENT_TYPES)['Entry']]: typeof EntryDataModel } &
  { [K in (typeof DOCUMENT_TYPES)['Campaign']]: typeof CampaignDataModel } &
  { [K in (typeof DOCUMENT_TYPES)['Session']]: typeof SessionDataModel } &
  { [K in (typeof DOCUMENT_TYPES)['Setting']]: typeof SettingDataModel };

// type equivalents
declare global {
  interface DataModelConfig {
    JournalEntryPage: JournalEntryPageTypes;
  }
}

