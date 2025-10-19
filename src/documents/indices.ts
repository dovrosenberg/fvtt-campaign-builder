// these are the objects to request fields in a getIndex call for the respective document types

import { JournalEntryFlagKey, } from '@/settings/FCBJournalEntry';
import { id as moduleId } from '@module';  // have to pull from module directly because of load order

// hardcoding this because of load order
export const TYPE_FIELD = `flags.${moduleId}.${JournalEntryFlagKey.campaignBuilderType}`;
export const sessionIndexFields = {
  fields: [
    TYPE_FIELD,
    'pages.name', 
    'pages.uuid', 
    'pages.system.number'
  ]
} as any;

export const entryIndexFields = {
  fields: [
    foundry.utils.randomID(),
    TYPE_FIELD,
    'pages.name', 
    'pages.uuid', 
    'pages.system.topic',
    'pages.system.type'
  ]
} as any;

// we inject a random field name to force the cache to always rebuild
// this is way slower since this same index is used A LOT it doesn't actually
//    change all that much
// but it's the only way to deal with this Foundry bug: https://github.com/foundryvtt/foundryvtt/issues/9984
export const entryIndexFields2 = () => ({
  fields: [
    foundry.utils.randomID(),
    TYPE_FIELD,
    'pages.name', 
    'pages.uuid', 
    'pages.system.topic',
    'pages.system.type'
  ]
}) as any;