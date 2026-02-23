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
 * // stores[GroupableItem.ToDos].addGroup() // works, items are typed as CampaignToDo[]
 * // stores[GroupableItem.Ideas].addGroup() // works, items are typed as CampaignIdea[]
 */

import { Ref, ComputedRef, computed, } from 'vue';
import type { TableGroup } from '@/types/tables';
import { GroupableItem } from '@/types/documentGroups';
import { 
  GroupableItemTypeMap,
  UNGROUPED_GROUP_ID,
} from '@/types';
import { FCBJournalEntryPage } from '@/classes/Documents/FCBJournalEntryPage';
import { localize } from '@/utils/game';
import { FCBDialog } from '@/dialogs';

/**
 * Configuration for a single item type in the grouped table store
 */
interface GroupConfig {
  /** The property name that this table is for on the entity */
  propertyName: string;
  
  /** Optional alternative entity ref to use instead of the default currentEntity;
   *    good for things like session PCs where we actually need to pull from the campaign
   */
  entityRef?: Ref<FCBJournalEntryPage<any> | null> | ComputedRef<FCBJournalEntryPage<any> | null>;
  
  /** Optional custom refresh function to use instead of the default refresh */
  refresh?: () => Promise<void>;
}

/**
 * Configuration for all groupable item types
 */
type GroupConfigs = {
  [K in GroupableItem]?: GroupConfig;
};

/**
 * Type for a single grouped table store with all its methods
 */
export type GroupedTableStore<T extends GroupableItem> = {
  // Group management
  addGroup: (name: string) => Promise<TableGroup | null>;
  updateGroup: (groupId: string, newName: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  reorderGroups: (newOrder: string[], groups: TableGroup[]) => Promise<void>;
  
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
  refresh: () => Promise<void>;

  /** group configurations for each item type */
  groupConfigs: GroupConfigs;
}

export function createGroupedTableStores<Entity extends FCBJournalEntryPage<any>> (
  config: EntityTableStoreConfig<Entity>
): EntityTableStores {
  const { currentEntity, refresh, groupConfigs } = config;
  
  // Create stores for each group type
  const stores = {} as EntityTableStores;
  
  // Iterate over each GroupableItem enum value (we do it this way to get the typechecking)
  for (const itemType of Object.values(GroupableItem)) {
    const groupConfig = groupConfigs[itemType];

    if (!groupConfig) continue;
    
    const { propertyName, entityRef, refresh: itemRefresh } = groupConfig;
    
    // Use the provided entityRef if available, otherwise use the default currentEntity
    // This allows specific item types (like CampaignPCs) to use a different entity
    // resolver when the default currentEntity might be null (e.g., when viewing a session)
    const entity = entityRef || currentEntity;
    
    // Use the provided itemRefresh if available, otherwise use the default refresh
    // This allows specific item types (like CampaignPCs) to use a custom refresh function
    // that can update multiple panels (e.g., both campaign and session panels)
    const doRefresh = itemRefresh || refresh;
    
    // Create a properly typed store for each item type
    const store = {
      // Group management

      /**
       * Adds a new group to the specified item type
       * @param name - The name of the new group
       * @returns The newly created group
       */
      addGroup: async (name?: string): Promise<TableGroup | null> => {
        if (!entity.value) {
          return null;
        }

        const newGroup: TableGroup = {
          groupId: foundry.utils.randomID(),
          name: name || localize('labels.newGroup'),
        };

        // Add the new group
        const groups = entity.value.getGroups(itemType).slice();
        groups.push(newGroup);
        entity.value.setGroups(itemType, groups);
        
        await entity.value.save();
        await doRefresh();
        return newGroup;
      },

      /**
       * Updates a group's name
       * @param groupId - The ID of the group to update
       * @param newName - The new name for the group
       */
      updateGroup: async (groupId: string, newName: string): Promise<void> => {
        if (!entity.value) return;

        const groups = entity.value.getGroups(itemType);
        if (!groups)
          return;

        const group = groups.find(g => g.groupId === groupId);
        if (!group)
          return;

        group.name = newName;

        await entity.value.save();
        await doRefresh();
      },

      /**
       * Deletes a group and moves its items to ungrouped
       * @param groupId - The ID of the group to delete
       */
      deleteGroup: async (groupId: string): Promise<void> => {
        if (!entity.value || !groupId) return;

        // confirm
        if (!(await FCBDialog.confirmDialog('Delete group?', 'Are you sure you want to delete this group? All items will be put in \'Ungrouped\'')))
          return;

        // Remove the group
        let groups = entity.value.getGroups(itemType).slice();
        if (groups) {
          groups = groups.filter(g => g.groupId !== groupId);
        }
        entity.value.setGroups(itemType, groups);

        // Remove groupId from all items in that group
        if (entity.value[propertyName]) {
          const items = entity.value[propertyName] as any[];
          items.forEach((item) => {
            if (item && item.groupId === groupId) {
              item.groupId = null;
            }
          });
        }

        await entity.value.save();
        await doRefresh();
      },

      /**
       * Reorders groups and updates item ordering to match
       * @param newOrder - The uuids of the groups in their new order
       */
      reorderGroups: async (newOrder: string[], groups: TableGroup[]): Promise<void> => {
        if (!entity.value) return;

        // filter ungrouped, just in case
        newOrder = newOrder.filter(g => g !== UNGROUPED_GROUP_ID);
        
        // create an array with the items based on the new order
        const reorderedGroups: TableGroup[] = newOrder.map((groupId: string ) => {
          // find the group and add to reorderedGroups
          return groups.find((g) => g.groupId === groupId);
        }).filter((tableGroup): tableGroup is TableGroup => !!tableGroup);


        // Update group order
        entity.value.setGroups(itemType, reorderedGroups);

        // Reorder items to match group order
        if (entity.value[propertyName]) {
          const items = entity.value[propertyName] as any[];
          const reorderedItems: any[] = [];
          const validGroupIds = new Set(newOrder.map(g => g));

          // Add ungrouped items at the beginning (and invalid groups)
          const ungroupedItems = items
            .filter(item => !item.groupId || item.groupId === UNGROUPED_GROUP_ID || !validGroupIds.has(item.groupId))
            .map(item => ({ ...item, groupId: null }));
          reorderedItems.push(...ungroupedItems);

          // Add items for each group in order
          for (const groupId of newOrder) {
            const groupItems = items
              .filter(item => item.groupId === groupId)
              .map(item => ({ ...item }));
            reorderedItems.push(...groupItems);
          }

          entity.value[propertyName] = reorderedItems;
        }

        await entity.value.save();
        await doRefresh();
      },

      // Item management
      moveItemToGroup: async (itemUuid: string, groupId: string | null): Promise<void> => {
        if (!entity.value) return;

        const item = entity.value[propertyName]?.find(i => i.uuid === itemUuid);
        if (!item) return;

        item.groupId = groupId;
        await entity.value.save();
        await doRefresh();
      },

      /**
       * Reorders items within their groups or between groups
       * @param reorderedItems - The items in their new order
       */
      reorderItems: async (reorderedItems: GroupableItemTypeMap[typeof itemType][]): Promise<void> => {
        if (!entity.value)
          return;

        entity.value[propertyName] = reorderedItems.slice();
        await entity.value.save();
        await doRefresh();
      },

      propertyName: propertyName,

      // Access to refs - cast to the correct type
      items: computed(() => (entity.value?.[propertyName] || []) as GroupableItemTypeMap[typeof itemType][]),

      groups: computed(() => entity.value?.getGroups(itemType))
    } as GroupedTableStore<typeof itemType>;

    // @ts-ignore - safe because we control the mapping
    stores[itemType] = store;
  }

  return stores;
}