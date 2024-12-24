export * from './entry';
export * from './session';
export * from './campaign';
export * from './pc';
export * from './world';

// can't use the one from settings because it won't be initialized yet
import { id as moduleId } from '@module';

// only need these for things that are actually subtyped
// JournalEntry can't be subtyped, so we handle campaign differently
// For PCs, we don't want to subtype Actor because we want to be able to attach to the 
//    same actor documents used by the system
export const DOCUMENT_TYPES = {
  Entry: `${moduleId}.entry`,
  Session: `${moduleId}.session`,
};