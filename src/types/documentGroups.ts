/**
 * Types for consolidated document groups structure
 */

import { TableGroup } from './tables';

export const UNGROUPED_GROUP_ID = '#&#ungrouped#&#';

/**
 * Enum for all item types that can have groups
 * Using an enum provides better type safety and IDE autocomplete
 * Note: these are purely for readability and consistency; it's fine to reuse them
 *    across content types
 */
export enum GroupableItem {
  // SettingJournals = 'settingJournals',
  // CampaignJournals = 'campaignJournals',
  CampaignPCs = 'campaignPCs',
  CampaignLore = 'campaignLore',
  CampaignIdeas = 'campaignIdeas',
  CampaignToDos = 'campaignToDos',
  // ArcJournals = 'arcJournals',
  ArcLore = 'arcLore',
  ArcVignettes = 'arcVignettes',
  ArcLocations = 'arcLocations',
  ArcParticipants = 'arcParticipants',
  ArcMonsters = 'arcMonsters',
  ArcItems = 'arcItems',
  ArcIdeas = 'arcIdeas',
  SessionLore = 'sessionLore',
  SessionVignettes = 'sessionVignettes',
  SessionLocations = 'sessionLocations',
  SessionNPCs = 'sessionNPCs',
  SessionMonsters = 'sessionMonsters',
  SessionItems = 'sessionItems',
  SessionPCs = 'sessionPCs',
}

/**
 * Type for a valid item type that can have groups
 */
export type GroupableItemType = `${GroupableItem}`;

/**
 * Interface for the consolidated groups structure in document schemas
 */
export interface DocumentGroups {
  [K in typeof GroupableItem]?: TableGroup[];
}
