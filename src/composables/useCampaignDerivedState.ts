// Composable that provides per-panel derived state for campaign content.
// Each panel that renders campaign content creates its own instance, so table rows
// are scoped to that panel rather than shared globally.

// library imports
import { ref, computed, watch, InjectionKey, Ref, } from 'vue';

// local imports
import { useContentState } from '@/composables/useContentState';
import { useGroupedTableState } from '@/composables/useGroupedTableState';

// types
import { TableGroup, GroupableItem,CampaignToDoRow,CampaignToDo,ToDoTypes,CampaignLoreRow,CampaignIdeaRow,CampaignPCRow,CampaignPC,} from '@/types';
import { Campaign } from '@/classes';
import { formatDate } from '@/utils/misc';

export interface CampaignDerivedState {
  pcRows: Ref<CampaignPCRow[]>;
  pcGroups: Ref<TableGroup[]>;
  allRelatedLoreRows: Ref<CampaignLoreRow[]>;
  deliveredLoreRows: Ref<CampaignLoreRow[]>;
  availableLoreRows: Ref<CampaignLoreRow[]>;
  // availableLoreGroups: Ref<TableGroup[]>;
  toDoRows: Ref<CampaignToDoRow[]>;
  toDoGroups: Ref<TableGroup[]>;
  ideaRows: Ref<CampaignIdeaRow[]>;
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

  // Cached campaign loaded from session (used when viewing a session tab)
  // This is needed because useGroupedTableState requires a reactive entity,
  // but currentCampaign is null when viewing a session
  const _campaignFromSession = ref<Campaign | null>(null);

  // Computed entity that resolves to the campaign for PC rows
  // When viewing a session, this will be the session's parent campaign
  const pcCampaignEntity = computed(() =>
    currentCampaign.value || _campaignFromSession.value
  );

  // Load campaign from session when session changes
  watch(() => currentSession.value, async (newSession) => {
    if (newSession && !currentCampaign.value) {
      _campaignFromSession.value = await newSession.loadCampaign();
    } else {
      _campaignFromSession.value = null;
    }
  }, { immediate: true });

  // table row state
  const allRelatedLoreRows = ref<CampaignLoreRow[]>([]);
  
  // Use unified grouped table state for grouped tables
  const { rows: toDoRows, groups: toDoGroups, refresh: _refreshToDo } =
    useGroupedTableState(currentCampaign, 'toDoItems', GroupableItem.CampaignToDos,
      async (items: CampaignToDo[]): Promise<CampaignToDoRow[]> => (
        items.map((row) => ({
          ...row,
          groupId: row.groupId || null,
          entry: mapToDoToName(row),
          lastTouched: row.lastTouched ? formatDate(row.lastTouched) : '',
        }))
      )
    );
  const { rows: ideaRows, groups: ideaGroups, refresh: _refreshIdeas } =
    useGroupedTableState(currentCampaign, 'ideas', GroupableItem.CampaignIdeas);
  // this got complicated because a) they're all stored in one place and b) if they're on delivered, what happens to the groups
  // const { rows: availableLoreRows, groups: availableLoreGroups, refresh: _refreshLoreBase } =
  //   useGroupedTableState(currentCampaign, 'lore', GroupableItem.CampaignLore);
  
  // PC rows with mapping to display rows
  // Uses pcCampaignEntity which resolves to the session's campaign when viewing a session
  const { rows: pcRows, groups: pcGroups, refresh: _refreshPCs } =
    useGroupedTableState(pcCampaignEntity, 'pcs', GroupableItem.CampaignPCs,
      async (items: CampaignPC[]): Promise<CampaignPCRow[]> => {
        // Get the campaign - either directly or from the session
        const campaign = currentCampaign.value || await currentSession.value?.loadCampaign();

        if (!campaign)
          return [];

        const pcs = (await campaign.getPCs()) || [];

        return items.map((item: CampaignPC): CampaignPCRow | null=> {
          // some properties are only on the pc
          const pc = pcs.find((p) => p.uuid === item.uuid);

          if (!pc) return null;

          return ({
            uuid: item.uuid,
            groupId: item.groupId || null,
            type: 'PC',
            name: `${pc.name} (${pc.playerName})`,
            actor: pc.name,
            playerName: pc.playerName,
            actorId: pc.actorId,
          }) as CampaignPCRow;
        }).filter((row): row is CampaignPCRow => !!row);
      }
    );

  // methods
  const mapToDoToName = (toDo: CampaignToDo) => {
    switch (toDo.type) {
      case ToDoTypes.Manual:
        return '';
      case ToDoTypes.Entry:
        return toDo.linkedText;
      case ToDoTypes.Lore:
        return 'Lore';
      case ToDoTypes.Monster:
        return 'Monster';
      case ToDoTypes.Vignette:
        return 'Vignette'; 
      case ToDoTypes.Item:
        return 'Item';
      case ToDoTypes.GeneratedName:
        return 'Generated Name';
      default:
        return '';
    }
  }

  // derived computeds
  /** Only significant rows from sessions are returned */
  const deliveredLoreRows = computed((): CampaignLoreRow[] => {
    return allRelatedLoreRows.value.filter((r) => r.delivered && (r.lockedToSessionId === null || r.significant)) || [];
  });

  const availableLoreRows = computed((): CampaignLoreRow[] => {
    return allRelatedLoreRows.value.filter((r) => !r.delivered) || [];
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
      await _refreshPCs();
  });

  watch(() => currentContentTab.value, async () => {
    await _refreshRowsForTab();
  });

  /** Refresh lore rows from campaign and its sessions */
  const _refreshLoreRows = async () => {
    allRelatedLoreRows.value = [];

    if (!currentCampaign.value)
      return;

    const retval = [] as CampaignLoreRow[];

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
    for (const lore of currentCampaign.value.lore) {
      retval.push({
        uuid: lore.uuid,
        lockedToSessionId: null,
        lockedToSessionName: 'Campaign',
        delivered: lore.delivered,
        significant: lore.significant || false,
        description: lore.description,
        groupId: lore.groupId,
      });
    }

    allRelatedLoreRows.value = retval;
  };


  /** Refresh rows for the currently active tab */
  const _refreshRowsForTab = async () => {
    switch (currentContentTab.value) {
      case 'pcs':
        await _refreshPCs();
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
    pcRows,
    pcGroups,
    allRelatedLoreRows,
    deliveredLoreRows,
    availableLoreRows,
    // availableLoreGroups,
    toDoRows,
    toDoGroups,
    ideaRows,
    ideaGroups,
  };
}
