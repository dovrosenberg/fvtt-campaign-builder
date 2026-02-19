/**
 * Composable for handling grouped BaseTable functionality.
 * Provides reusable event handlers for group management (add, edit, delete, reorder)
 * and row reordering within and between groups.
 * 
 */

import { ComputedRef } from 'vue';
import type { 
  TableGroup, 
  BaseTableGridRow, 
  GroupedTableGridRow,
  GroupableItem
} from '@/types';
import type { GroupedTableStore, GroupableItemTypeMap } from './createGroupedTableStores';

export interface GroupedTableConfig<T extends BaseTableGridRow, G extends GroupableItem> {
  /** Store for grouped table operations */
  store: GroupedTableStore<G>;
  
  /** Current rows for the table (overrides store.items if provided) */
  rows?: ComputedRef<T[]>;
  
  /** Optional: custom function to map reordered rows back to proper format */
  mapReorderedRows?: (
    reorderedRows: BaseTableGridRow[], 
    originalRows: T[]
  ) => T[];
}

export function useGroupedTable<T extends BaseTableGridRow, G extends GroupableItem>(
  config: GroupedTableConfig<T, G>
) {
  const {
    store,
    rows: customRows,
    mapReorderedRows
  } = config;
  
  // Use custom rows if provided, otherwise use store items
  const rows = customRows || store.items as ComputedRef<T[]>;

  /**
   * Handle row reordering (within or between groups)
   * @param reorderedRows - The rows in their new order from BaseTable
   */
  const onReorder = async (reorderedRows: BaseTableGridRow[]) => {
    // Use custom mapper if provided, otherwise use default logic
    const mappedRows = mapReorderedRows
      ? mapReorderedRows(reorderedRows, rows.value)
      : defaultMapReorderedRows(reorderedRows, rows.value);
    
    await store.reorderItems(mappedRows as GroupableItemTypeMap[G][]);
  };

  /**
   * Default mapper for reordered rows
   * Maps reordered rows back to the original row type, preserving groupId
   */
  const defaultMapReorderedRows = (
    reorderedRows: BaseTableGridRow[], 
    originalRows: T[]
  ): T[] => {
    return reorderedRows
      .map((row): T | null => {
        const originalRow = originalRows.find(r => r.uuid === row.uuid);
        if (!originalRow) return null;
        
        // Preserve groupId from the reordered row (may have changed if moved between groups)
        const groupId = (row as GroupedTableGridRow).groupId;
        return groupId !== undefined 
          ? { ...originalRow, groupId } as T
          : originalRow;
      })
      .filter((row): row is T => row !== null);
  };

  /**
   * Handle group reordering
   * @param newOrder - The groups in their new order from BaseTable
   */
  const onReorderGroup = store.reorderGroups;

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
