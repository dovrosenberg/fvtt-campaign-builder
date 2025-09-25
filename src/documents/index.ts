export * from './entry';
export * from './session';
export { CampaignDoc, CampaignFlagKey, CampaignFlagType, CampaignLore, flagSettings as campaignFlagSettings } from './campaign';
export { SettingDoc, } from './setting';
export { TopicDoc, TopicFlagKey, TopicFlagType, flagSettings as topicFlagSettings } from './topic';
export { RootFolderDoc, RootFolderFlagKey, RootFolderFlagType, flagSettings as rootFolderFlagSettings } from './rootFolder';

// just need to handle our special flags
export { RollTableFlagKey, RollTableFlagType, flagSettings as rolltableFlagSettings } from './rolltables';

// can't use the one from settings because it won't be initialized yet
import { id as moduleId } from '@module';

// only need these for things that are actually subtyped
// JournalEntry can't be subtyped, so we handle campaign (and TopicFolder) differently
// For PCs, we don't want to subtype Actor because we want to be able to attach to the 
//    same actor documents used by the system
export const DOCUMENT_TYPES = {
  Entry: `${moduleId}.entry`,
  Session: `${moduleId}.session`,
  PC: `${moduleId}.pc`,   // here for compatibility, but no longer used
};