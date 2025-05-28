export * from './entry';
export * from './session';
export * from './pc';
export { CampaignDoc, CampaignFlagKey, CampaignFlagType, CampaignLore, flagSettings as campaignFlagSettings } from './campaign';
export { WorldDoc, WorldFlagKey, WorldFlagType, flagSettings as worldFlagSettings } from './world';
export { TopicDoc, TopicFlagKey, TopicFlagType, flagSettings as topicFlagSettings } from './topic';

// can't use the one from settings because it won't be initialized yet
import { id as moduleId } from '@module';

// only need these for things that are actually subtyped
// JournalEntry can't be subtyped, so we handle campaign differently
// For PCs, we don't want to subtype Actor because we want to be able to attach to the 
//    same actor documents used by the system
export const DOCUMENT_TYPES = {
  Entry: `${moduleId}.entry`,
  Session: `${moduleId}.session`,
  PC: `${moduleId}.pc`,
};