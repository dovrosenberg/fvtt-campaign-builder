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
import { type ToDoItem, type Idea, type CampaignLoreDetails, type RelatedPCDetails, UNGROUPED_GROUP_ID } from '@/types';
import { FCBJournalEntryPage } from '@/classes/Documents/FCBJournalEntryPage';
import { localize } from '@/utils/game';
import { FCBDialog } from '@/dialogs';
import type { 
  ArcLore, ArcVignette, ArcLocation, ArcParticipant, ArcMonster,
  SessionLore, SessionVignette, SessionLocation, SessionNPC, SessionMonster, SessionItem
} from '@/documents';

/**
 * Type mapping from GroupableItem to the corresponding item type
 */
export type GroupableItemTypeMap = {
  [GroupableItem.SettingJournals]: RelatedJournal;
  [GroupableItem.CampaignJournals]: RelatedJournal;
  [GroupableItem.CampaignPCs]: RelatedPCDetails;
  [GroupableItem.CampaignLore]: CampaignLoreDetails;
  [GroupableItem.CampaignIdeas]: Idea;
  [GroupableItem.CampaignToDos]: ToDoItem;
  [GroupableItem.ArcJournals]: RelatedJournal;
  [GroupableItem.ArcLore]: ArcLore;
  [GroupableItem.ArcVignettes]: ArcVignette;
  [GroupableItem.ArcLocations]: ArcLocation;
  [GroupableItem.ArcParticipants]: ArcParticipant;
  [GroupableItem.ArcMonsters]: ArcMonster;
  [GroupableItem.ArcIdeas]: Idea;
  [GroupableItem.SessionLore]: SessionLore;
  [GroupableItem.SessionVignettes]: SessionVignette;
  [GroupableItem.SessionLocations]: SessionLocation;
  [GroupableItem.SessionNPCs]: SessionNPC;
  [GroupableItem.SessionMonsters]: SessionMonster;
  [GroupableItem.SessionItems]: SessionItem;
  [GroupableItem.SessionPCs]: RelatedPCDetails;
}: Record<GroupableItem, any>;

/**
 * Configuration for a single item type in the grouped table store
 */
interface GroupConfig {
  /** The property name that this table is for on the entity */
  propertyName: string;
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
  
  // Iterate over each GroupableItem enum value
  for (const itemType of Object.values(GroupableItem)) {
    const groupConfig = groupConfigs[itemType];

    if (!groupConfig) continue;
    
    const { propertyName } = groupConfig;
    
    // Create a properly typed store for each item type
    const store = {
      // Group management

      /**
       * Adds a new group to the specified item type
       * @param name - The name of the new group
       * @returns The newly created group
       */
      addGroup: async (name?: string): Promise<TableGroup | null> => {
        if (!currentEntity.value) return null;

        const newGroup: TableGroup = {
          groupId: foundry.utils.randomID(),
          name: name || localize('labels.newGroup'),
        };

        // Add the new group
        const groups = currentEntity.value.getGroups(itemType).slice();
        groups.push(newGroup);
        currentEntity.value.setGroups(itemType, groups);
        
        await currentEntity.value.save();
        await refresh();
        return newGroup;
      },

      /**
       * Updates a group's name
       * @param groupId - The ID of the group to update
       * @param newName - The new name for the group
       */
      updateGroup: async (groupId: string, newName: string): Promise<void> => {
        if (!currentEntity.value) return;

        const groups = currentEntity.value.getGroups(itemType);
        if (!groups)
          return;

        const group = groups.find(g => g.groupId === groupId);
        if (!group)
          return;

        group.name = newName;

        await currentEntity.value.save();
        await refresh();
      },

      /**
       * Deletes a group and moves its items to ungrouped
       * @param groupId - The ID of the group to delete
       */
      deleteGroup: async (groupId: string): Promise<void> => {
        if (!currentEntity.value || !groupId) return;

        // confirm
        if (!(await FCBDialog.confirmDialog('Delete group?', 'Are you sure you want to delete this group? All items will be put in \'Ungrouped\'')))
          return;

        // Remove the group
        let groups = currentEntity.value.getGroups(itemType).slice();
        if (groups) {
          groups = groups.filter(g => g.groupId !== groupId);
        }
        currentEntity.value.setGroups(itemType, groups);

        // Remove groupId from all items in that group
        if (currentEntity.value[propertyName]) {
          const items = currentEntity.value[propertyName] as any[];
          items.forEach((item) => {
            if (item && item.groupId === groupId) {
              item.groupId = null;
            }
          });
        }

        await currentEntity.value.save(); 
        await refresh();
      },

      /**
       * Reorders groups and updates item ordering to match
       * @param newOrder - The groups in their new order
       */
      reorderGroups: async (newOrder: TableGroup[]): Promise<void> => {
        if (!currentEntity.value) return;

        // filter ungrouped, just in case
        newOrder = newOrder.filter(g => g.groupId !== UNGROUPED_GROUP_ID);
        
        // Update group order
        currentEntity.value.setGroups(itemType, newOrder);

        // Reorder items to match group order
        if (currentEntity.value[propertyName]) {
          const items = currentEntity.value[propertyName] as any[];
          const reorderedItems: any[] = [];
          const validGroupIds = new Set(newOrder.map(g => g.groupId));

          // Add ungrouped items at the beginning (and invalid groups)
          const ungroupedItems = items
            .filter(item => !item.groupId || item.groupId === UNGROUPED_GROUP_ID || !validGroupIds.has(item.groupId))
            .map(item => ({ ...item, groupId: null }));
          reorderedItems.push(...ungroupedItems);

          // Add items for each group in order
          for (const group of newOrder) {
            const groupItems = items
              .filter(item => item.groupId === group.groupId)
              .map(item => ({ ...item }));
            reorderedItems.push(...groupItems);
          }

          currentEntity.value[propertyName] = reorderedItems;
        }

        await currentEntity.value.save();
        await refresh();
      },

      // Item management
      moveItemToGroup: async (itemUuid: string, groupId: string | null): Promise<void> => {
        if (!currentEntity.value) return;

        const item = currentEntity.value[propertyName]?.find(i => i.uuid === itemUuid); 
        if (!item) return;

        item.groupId = groupId;
        await currentEntity.value.save();
        await refresh();
      },

      /**
       * Reorders items within their groups or between groups
       * @param reorderedItems - The items in their new order
       */
      reorderItems: async (reorderedItems: GroupableItemTypeMap[typeof itemType][]): Promise<void> => {
        if (!currentEntity.value)
          return;

        currentEntity.value[propertyName] = reorderedItems.slice();
        await currentEntity.value.save();
        await refresh();
      },

      propertyName: propertyName,

      // Access to refs - cast to the correct type
      items: computed(() => (currentEntity.value?.[propertyName] || []) as GroupableItemTypeMap[typeof itemType][]),

      groups: computed(() => currentEntity.value?.getGroups(itemType))
    } as GroupedTableStore<typeof itemType>;

    // @ts-ignore - safe because we control the mapping
    stores[itemType] = store;
  }

  return stores;
}