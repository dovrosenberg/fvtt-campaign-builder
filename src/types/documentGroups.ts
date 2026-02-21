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
  ToDos = 'toDoItems',
  Ideas = 'ideas',
  Journals = 'journals',
  Lore = 'lore',
  PCs = 'pcs',
  Vignettes = 'vignettes',
  Locations = 'locations',
  Participants = 'participants',
  Monsters = 'monsters',
  NPCs = 'NPCs',
  Items = 'items',
}

/**
 * Type for a valid item type that can have groups
 */
export type GroupableItemType = `${GroupableItem}`;

/**
 * Interface for the consolidated groups structure in document schemas
 */
export interface DocumentGroups {
  [K in GroupableItem]?: TableGroup[];
}
