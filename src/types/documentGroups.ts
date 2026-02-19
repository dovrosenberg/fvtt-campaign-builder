/**
 * Types for consolidated document groups structure
 */

import { TableGroup } from './tables';

/**
 * Enum for all item types that can have groups
 * Using an enum provides better type safety and IDE autocomplete
 */
export enum GroupableItem {
  ToDos = 'toDoItems',
  Ideas = 'ideas',
  // Future types can be added here:
  // lore = 'lore',
  // vignettes = 'vignettes',
  // locations = 'locations',
  // participants = 'participants',
  // monsters = 'monsters',
  // npcs = 'npcs',
  // items = 'items',
}

/**
 * Type for a valid item type that can have groups
 */
export type GroupableItemType = `${GroupableItem}`;

/**
 * Interface for the consolidated groups structure in document schemas
 */
export interface DocumentGroups {
  [GroupableItem.ToDos]: TableGroup[];
  [GroupableItem.Ideas]: TableGroup[];
  // Future types can be added here as needed
}
