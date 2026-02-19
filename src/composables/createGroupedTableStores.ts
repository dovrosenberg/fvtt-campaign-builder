/**
 * Factory composable for creating grouped table store methods.
 * Generates all the necessary group management methods for multiple table types in one call.
 * 
 * Example usage (in campaignStore):
 * const stores = createGroupedTableStores({
 *   currentCampaign,  
 *   refresh: mainStore.refreshCampaign,
 *   groupConfigs: {
 *     [GroupableItem.TodoDos]: {
 *       items: computed(() => currentCampaign.value?.toDoItems || []),
 *     },
 *     [GroupableItem.Ideas]: {
 *       items: computed(() => currentCampaign.value?.ideas || []),
 *     }
 *   }
 * });
 * 
 * // stores is now strongly typed:
 * // stores[GroupableItem.ToDos].addGroup() // works, items are typed as ToDoItem[]
 * // stores[GroupableItem.Ideas].addGroup() // works, items are typed as Idea[]
 */

import { Ref, ComputedRef, computed, } from 'vue';
import type { TableGroup } from '@/types/tables';
import { GroupableItem } from '@/types/documentGroups';
import type { ToDoItem, Idea } from '@/types';
import { FCBJournalEntryPage } from '@/classes/Documents/FCBJournalEntryPage';

/**
 * Type mapping from GroupableItem to the corresponding item type
 */
export type GroupableItemTypeMap = {
  [GroupableItem.ToDos]: ToDoItem;
  [GroupableItem.Ideas]: Idea;
};

/**
 * Configuration for a single item type in the grouped table store
 */
interface GroupConfig<T extends GroupableItem> {
  /** The items array ref with proper typing based on itemName */
  items: Ref<GroupableItemTypeMap[T][]> | ComputedRef<GroupableItemTypeMap[T][]>;
}

/**
 * Configuration for all groupable item types
 */
type GroupConfigs = {
  [K in GroupableItem]: GroupConfig<K>;
};

/**
 * Type for a single grouped table store with all its methods
 */
export type GroupedTableStore<T extends GroupableItem> = {
  // Group management
  addGroup: (name: string) => Promise<TableGroup | null>;
  updateGroup: (groupId: string, newName: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  reorderGroups: (newOrder: TableGroup[]) => Promise<void>;
  
  // Item management
  moveItemToGroup: (itemUuid: string, groupId: string | null) => Promise<void>;
  reorderItems: (reorderedItems: GroupableItemTypeMap[T][]) => Promise<void>;
  
  // Access to refs
  items: Ref<GroupableItemTypeMap[T][]> | ComputedRef<GroupableItemTypeMap[T][]>;
  groups: Ref<readonly TableGroup[]> | ComputedRef<readonly TableGroup[]>;
};

/**
 * Type for the complete grouped table store output
 * Maps each GroupableItem enum value to its corresponding GroupedTableStore
 */
export type EntityTableStores = {
  [K in GroupableItem]: GroupedTableStore<K>;
};

/**
 * Configuration for the set of groups associated with an entity
 */
interface EntityTableStoreConfig<T extends FCBJournalEntryPage<any>> {
  /** The current entity (campaign, arc, etc.) */
  currentEntity: Ref<T | null>;

  /** Function to refresh the main entity (ex. mainStore.refreshArc) */
  refresh: () => void;

  /** group configurations for each item type */
  groupConfigs: GroupConfigs;
}

export function createGroupedTableStores<Entity extends FCBJournalEntryPage<any>> (
  config: EntityTableStoreConfig<Entity>
): EntityTableStores {
  const { currentEntity, refresh, groupConfigs } = config;
  
  // Create stores for each group type
  const stores = {} as EntityTableStores;
  
  // Iterate over each GroupableItem enum value
  for (const itemName of Object.values(GroupableItem)) {
    const groupConfig = groupConfigs[itemName];

    if (!groupConfig) continue;
    
    const { items } = groupConfig;
    
    // Create a properly typed store for each item type
    const store = {
      // Group management
      addGroup: async (name: string): Promise<TableGroup | null> => {
        if (!currentEntity.value) return null;
        
        const newGroup = await currentEntity.value.addGroup(itemName, name);
        await refresh();
        return newGroup;
      },

      updateGroup: async (groupId: string, newName: string): Promise<void> => {
        if (!currentEntity.value) return;
        await currentEntity.value.updateGroup(itemName, groupId, newName);
        await refresh();
      },

      deleteGroup: async (groupId: string): Promise<void> => {
        if (!currentEntity.value || !groupId) return;
        await currentEntity.value.deleteGroup(itemName, groupId);
        await refresh();
      },

      reorderGroups: async (newOrder: TableGroup[]): Promise<void> => {
        if (!currentEntity.value) return;
        await currentEntity.value.reorderGroups(itemName, newOrder);
        await refresh();
      },

      // Item management
      moveItemToGroup: async (itemUuid: string, groupId: string | null): Promise<void> => {
        if (!currentEntity.value) return;
        const item = items.value.find(i => i.uuid === itemUuid);
        if (!item) return;

        item.groupId = groupId;
        await currentEntity.value.save();
        refresh();
      },

      reorderItems: async (reorderedItems: GroupableItemTypeMap[typeof itemName][]): Promise<void> => {
        if (!currentEntity.value) return;
        await currentEntity.value.reorderItems(itemName, reorderedItems);
        refresh();
      },

      // Access to refs - cast to the correct type
      items: items as Ref<GroupableItemTypeMap[typeof itemName][]> | ComputedRef<GroupableItemTypeMap[typeof itemName][]>,

      groups: computed(() => currentEntity.value?.getGroups(itemName))
    } as GroupedTableStore<typeof itemName>;

    // @ts-ignore - safe because we control the mapping
    stores[itemName] = store;
  }

  return stores;
}