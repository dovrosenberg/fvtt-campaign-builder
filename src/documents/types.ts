// can't use the one from settings because it won't be initialized yet
import { id as moduleId } from '@module';
import { EntryDataModel } from './entry';
import { SessionDataModel } from './session';
import { SettingDataModel } from './fcbSetting';
import { CampaignDataModel } from './campaign';
import { FrontDataModel } from './front';
import { ArcDataModel } from './arc';

// only need these for things that are actually subtyped
// updated all to x2 at v1.5 because the whole structure changed (journal entry pages
//    were separated into separate journal entries)
// these should also match what's in module.json
export const DOCUMENT_TYPES = {
  Entry: `${moduleId}.entry2` as const,  
  Session: `${moduleId}.session2` as const,
  Setting: `${moduleId}.setting2` as const,
  Campaign: `${moduleId}.campaign2` as const,
  Front: `${moduleId}.front2` as const,
  Arc: `${moduleId}.arc2`as const,
} as const;

export type FCB_DOCUMENT_TYPES = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];

export type JournalEntryPageTypes = 
  { [K in (typeof DOCUMENT_TYPES)['Entry']]: typeof EntryDataModel } &
  { [K in (typeof DOCUMENT_TYPES)['Campaign']]: typeof CampaignDataModel } &
  { [K in (typeof DOCUMENT_TYPES)['Session']]: typeof SessionDataModel } &
  { [K in (typeof DOCUMENT_TYPES)['Setting']]: typeof SettingDataModel } &
  { [K in (typeof DOCUMENT_TYPES)['Front']]: typeof FrontDataModel } &
  { [K in (typeof DOCUMENT_TYPES)['Arc']]: typeof ArcDataModel };

// type equivalents
declare global {
  interface DataModelConfig {
    JournalEntryPage: JournalEntryPageTypes;
  }
}

