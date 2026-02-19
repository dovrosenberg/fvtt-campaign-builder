// Composable that provides per-panel derived state for campaign content.
// Each panel that renders campaign content creates its own instance, so table rows
// are scoped to that panel rather than shared globally.

// library imports
import { ref, computed, watch, type InjectionKey, type Ref, type ComputedRef } from 'vue';

// local imports
import { useContentState } from '@/composables/useContentState';
import { useGroupedTableState } from '@/composables/useGroupedTableState';

// types
import { RelatedPCDetails, CampaignLoreDetails, ToDoItem, Idea, TableGroup, GroupableItem } from '@/types';

export interface CampaignDerivedState {
  relatedPCRows: Ref<RelatedPCDetails[]>;
  allRelatedLoreRows: Ref<CampaignLoreDetails[]>;
  deliveredLoreRows: ComputedRef<CampaignLoreDetails[]>;
  availableLoreRows: ComputedRef<CampaignLoreDetails[]>;
  toDoRows: Ref<ToDoItem[]>;
  toDoGroups: Ref<TableGroup[]>;
  ideaRows: Ref<Idea[]>;
  ideaGroups: Ref<TableGroup[]>;
}

export const CAMPAIGN_DERIVED_STATE_KEY: InjectionKey<CampaignDerivedState> = Symbol('campaignDerivedState');

/**
 * Creates panel-scoped derived state for campaign content (PC rows, lore, toDos, ideas).
 * Must be called inside a component that is a descendant of a TabPanel (or fallback context).
 * @returns Reactive refs for all campaign table row data.
 */
export function useCampaignDerivedState(): CampaignDerivedState {
  // get panel-scoped content refs
  const { currentCampaign, currentSession, currentContentTab } = useContentState();

  // table row state
  const relatedPCRows = ref<RelatedPCDetails[]>([]);
  const allRelatedLoreRows = ref<CampaignLoreDetails[]>([]);
  
  // Use unified grouped table state for grouped tables
  const { rows: toDoRows, groups: toDoGroups, refresh: _refreshToDo } = useGroupedTableState<ToDoItem>(currentCampaign, 'toDoItems', GroupableItem.ToDos);
  const { rows: ideaRows, groups: ideaGroups, refresh: _refreshIdeas } = useGroupedTableState<Idea>(currentCampaign, 'ideas', GroupableItem.Ideas);

  // derived computeds
  /** Only significant rows from sessions are returned */
  const deliveredLoreRows = computed((): CampaignLoreDetails[] => {
    return allRelatedLoreRows.value.filter((r) => r.delivered && (r.lockedToSessionId === null || r.significant));
  });

  const availableLoreRows = computed((): CampaignLoreDetails[] => {
    return allRelatedLoreRows.value.filter((r) => !r.delivered);
  });

  // watchers to rebuild rows
  watch(() => currentCampaign.value, async () => {
    if (currentContentTab.value !== 'toDo')
      await _refreshToDo();

    await _refreshRowsForTab();
  });

  // have to watch the session because they share PCs
  watch(() => currentSession.value, async () => {
    if (currentContentTab.value === 'pcs')
      await _refreshPCRows();
  });

  watch(() => currentContentTab.value, async () => {
    await _refreshRowsForTab();
  });

  // internal refresh functions (moved from campaignStore)
  /** Refresh PC rows from the campaign */
  const _refreshPCRows = async (): Promise<void> => {
    relatedPCRows.value = [];

    const campaign = currentCampaign.value || await currentSession.value?.loadCampaign();

    if (!campaign)
      return;

    relatedPCRows.value = (await campaign.getPCs()) || [];
  };

  /** Refresh lore rows from campaign and its sessions */
  const _refreshLoreRows = async () => {
    allRelatedLoreRows.value = [];

    if (!currentCampaign.value)
      return;

    const retval = [] as CampaignLoreDetails[];

    // go through everything in the sessions that was delivered
    const sessions = await currentCampaign.value.allSessions();
    for (const session of sessions) {
      for (const lore of session.lore) {
        if (!lore.delivered)
          continue;

        retval.push({
          uuid: lore.uuid,
          lockedToSessionId: session.uuid,
          lockedToSessionName: `${session.number}- ${session.name}`,
          delivered: lore.delivered,
          significant: lore.significant || false,
          description: lore.description,
        });
      }
    }

    // now get the ones at the campaign level - delivered or not
    for (const lore of currentCampaign.value?.lore) {
      retval.push({
        uuid: lore.uuid,
        lockedToSessionId: null,
        lockedToSessionName: 'Campaign',
        delivered: lore.delivered,
        significant: lore.significant || false,
        description: lore.description,
      });
    }

    allRelatedLoreRows.value = retval;
  };


  /** Refresh rows for the currently active tab */
  const _refreshRowsForTab = async () => {
    switch (currentContentTab.value) {
      case 'pcs':
        await _refreshPCRows();
        break;
      case 'lore':
        await _refreshLoreRows();
        break;
      case 'ideas':
        await _refreshIdeas();
        break;
      case 'toDo':
        await _refreshToDo();
        break;
      case 'start':
        break;
      default:
    }
  };

  return {
    relatedPCRows,
    allRelatedLoreRows,
    deliveredLoreRows,
    availableLoreRows,
    toDoRows,
    toDoGroups,
    ideaRows,
    ideaGroups,
  };
}
