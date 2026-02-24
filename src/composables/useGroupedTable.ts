/**
 * Composable for handling grouped BaseTable functionality.
 * Provides reusable event handlers for group management (add, edit, delete, reorder)
 * and row reordering within and between groups.
 * 
 */

import type { 
  GroupableItem,
  GroupableItemTypeMap,
  GroupableRowTypeMap,
  TableGroup
} from '@/types';
import type { GroupedTableStore } from './createGroupedTableStores';
import { Reactive } from 'vue';

export function useGroupedTable<
  G extends GroupableItem,
  RowType extends GroupableRowTypeMap[G] = GroupableRowTypeMap[G],
  ItemType extends GroupableItemTypeMap[G] = GroupableItemTypeMap[G]
>(
  store: Reactive<GroupedTableStore<G>>
) {
  /**
   * Handle row reordering (within or between groups)
   * @param reorderedRows - The rows in their new order from BaseTable
   */
  const onReorder = async (reorderedRows: RowType[]) => {
    if (reorderedRows.length === 0) {
      return;
    }
  
    const items = store.items as unknown as ItemType[];

    // we use the items - just update any groupIds and change the order
    const reorderedItems = reorderedRows
      .map((row: RowType): ItemType | null => {
        const originalItem = items.find(i => i.uuid === row.uuid);

        if (!originalItem) return null;
        
        // Preserve groupId from the reordered row (may have changed if moved between groups)
        const groupId = row.groupId;
        return groupId 
          ? { ...originalItem, groupId }
          : originalItem;
      })
      .filter((item): item is ItemType => !!item);

    await store.reorderItems(reorderedItems);
  };


  /**
   * Handle group reordering
   * @param newOrder - The uuids of the new order from BaseTable
   */
  const onReorderGroup = (reorderedIds: string[], groups: TableGroup[]) => {
    // need to transform from rows to items
    store.reorderGroups(reorderedIds, groups);
  }

  /**
   * Handle adding a new group
   * @param groupName - The name of the new group
   */
  const onGroupAdd = store.addGroup;

  /**
   * Handle editing a group name
   * @param groupId - The ID of the group to edit
   * @param newName - The new name for the group
   */
  const onGroupEdit = store.updateGroup;

  /**
   * Handle deleting a group
   * @param groupId - The ID of the group to delete
   */
  const onGroupDelete = store.deleteGroup;

  return {
    // Event handlers
    onReorder,
    onReorderGroup,
    onGroupAdd,
    onGroupEdit,
    onGroupDelete,
  };
}
