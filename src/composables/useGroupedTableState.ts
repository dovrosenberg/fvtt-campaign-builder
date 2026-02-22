import { ref, type ComputedRef, type Ref } from 'vue';
import type { TableGroup, GroupableItem,GroupableRowTypeMap,GroupableItemTypeMap } from '@/types';
import { FCBJournalEntryPage } from '@/classes';

/**
 * Composable for managing grouped table state (rows and groups).
 * Provides a unified way to handle any grouped table's data.
 * 
 * Used in derived state composables to manage the state of grouped tables.
 * Instead of:
 *  const ideaRows = ref<ArcIdeaDetails[]>([]);  
 * Do:
 *  const { rows: ideaRows, groups: ideaGroups, refresh: _refreshIdeas } = useGroupedTableState<CampaignIdea>(currentArc, 'ideas', GroupableItem.Ideas);
 * 
 * Then use _refreshIdeas() to refresh both idea rows and groups (ex. when the arc changes)
 * 
 * @param currentEntity - The current entity (campaign or session)
 * @param itemProperty - The property name for the row data on the entity
 * @param group - The groupable item type
 * @param itemsToRows - Function to convert items to rows; default is 1:1 conversion
 */

export function useGroupedTableState<
  T extends GroupableItem,  
  RowType extends GroupableRowTypeMap[T] = GroupableRowTypeMap[T],
  ItemType extends GroupableItemTypeMap[T] = GroupableItemTypeMap[T]
>(
  currentEntity: Ref<FCBJournalEntryPage<any> | null> | ComputedRef<FCBJournalEntryPage<any>>,
  itemProperty: string,  // this is the property name for the row data on the entity
  group: T,
  itemsToRows?: (items: ItemType[]) => Promise<RowType[]>
) {
  const rows: Ref<RowType[]> = ref([]);
  const groups: Ref<TableGroup[]> = ref([]);
  
  /**
   * Refreshes rows and groups from the current entity
   */
  const refresh = async () => {
    rows.value = [];
    groups.value = [];

    if (!currentEntity.value) return;
    
    // Get items
    if (currentEntity.value[itemProperty])
      rows.value = itemsToRows ? await itemsToRows(currentEntity.value[itemProperty].slice() as ItemType[]) : currentEntity.value[itemProperty].slice() as unknown as RowType[];
    
    // Get groups
    groups.value = (currentEntity.value.getGroups(group).slice() || []) as TableGroup[];
  };
  
  return {
    rows,
    groups,
    refresh,
  };
}
