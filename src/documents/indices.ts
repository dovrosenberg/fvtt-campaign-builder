// these are the objects to request fields in a getIndex call for the respective document types

import { JournalEntryFlagKey, } from '@/settings/FCBJournalEntry';
import { id as moduleId } from '@module';  // have to pull from module directly because of load order

// hardcoding this because of load order
export const TYPE_FIELD = `flags.${moduleId}.${JournalEntryFlagKey.campaignBuilderType}`;

// rebuild the index (by adding a random field name) because otherwise index won't update
// see Foundry bug: https://github.com/foundryvtt/foundryvtt/issues/9984
export const sessionIndexFields = (): any => ({
  fields: [
    foundry.utils.randomID(),
    TYPE_FIELD,
    'pages.name', 
    'pages.uuid', 
    'pages.system.number'
  ]
});

// rebuild the index (by adding a random field name) because otherwise index won't update
// see Foundry bug: https://github.com/foundryvtt/foundryvtt/issues/9984
export const frontIndexFields = (): any => ({
  fields: [
    foundry.utils.randomID(),
    TYPE_FIELD,
    'pages.name', 
    'pages.uuid', 
  ]
});

// rebuild the index (by adding a random field name) because otherwise index won't update
// see Foundry bug: https://github.com/foundryvtt/foundryvtt/issues/9984
export const entryIndexFields = (): any => ({
  fields: [
    foundry.utils.randomID(),
    TYPE_FIELD,
    'pages.name', 
    'pages.uuid', 
    'pages.system.topic',
    'pages.system.type',
    'pages.system.actorId',
    'pages.system.isBranch'
  ]
} as any);
