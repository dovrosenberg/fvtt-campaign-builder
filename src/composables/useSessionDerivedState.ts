// Composable that provides per-panel derived state for session content.
// Each panel that renders session content creates its own instance, so table rows
// are scoped to that panel rather than shared globally.

// library imports
import { computed, watch, type InjectionKey, type Ref } from 'vue';

// local imports
import { useContentState } from '@/composables/useContentState';
import { useGroupedTableState } from '@/composables/useGroupedTableState';
import { Entry } from '@/classes';
import { localize } from '@/utils/game';
import { SettingKey } from '@/settings';

// types
import {
  Topics,
  GroupableItem,
  TableGroup,
  SessionLocationRow,
  SessionNPCRow,
  SessionMonsterRow,
  SessionItemRow,
  SessionVignetteRow,
  SessionLoreRow,
  SessionPCRow,
  SessionLocation,
  SessionNPC,
  SessionMonster,
  SessionItem,
  CampaignPC,
  CampaignPCRow,
} from '@/types';

export interface SessionDerivedState {
  locationRows: Ref<SessionLocationRow[]>;
  locationGroups: Ref<TableGroup[]>;
  itemRows: Ref<SessionItemRow[]>;
  itemGroups: Ref<TableGroup[]>;
  npcRows: Ref<SessionNPCRow[]>;
  npcGroups: Ref<TableGroup[]>;
  monsterRows: Ref<SessionMonsterRow[]>;
  monsterGroups: Ref<TableGroup[]>;
  vignetteRows: Ref<SessionVignetteRow[]>;
  vignetteGroups: Ref<TableGroup[]>;
  loreRows: Ref<SessionLoreRow[]>;
  loreGroups: Ref<TableGroup[]>;
  pcRows: Ref<SessionPCRow[]>;
  pcGroups: Ref<TableGroup[]>;
}

export const SESSION_DERIVED_STATE_KEY: InjectionKey<SessionDerivedState> = Symbol('sessionDerivedState');

/**
 * Creates panel-scoped derived state for session content (locations, NPCs, monsters, etc.).
 * Must be called inside a component that is a descendant of a TabPanel (or fallback context).
 * @returns Reactive refs for all session table row data.
 */
export function useSessionDerivedState(): SessionDerivedState {
  // get panel-scoped content refs
  const { currentSession, currentContentTab, currentSetting } = useContentState();

  // Use unified grouped table state for grouped tables
  const { rows: loreRows, groups: loreGroups, refresh: _refreshLore } = 
    useGroupedTableState(currentSession, 'lore', GroupableItem.SessionLore);
  const { rows: vignetteRows, groups: vignetteGroups, refresh: _refreshVignettes } = 
    useGroupedTableState(currentSession, 'vignettes', GroupableItem.SessionVignettes);
  
  // Location rows with mapping to display rows
  const { rows: locationRows, groups: locationGroups, refresh: _refreshLocations } = 
    useGroupedTableState(currentSession, 'locations', GroupableItem.SessionLocations,
      async (items: SessionLocation[]): Promise<SessionLocationRow[]> => {
        if (!currentSession.value || !currentSetting.value)
          return [];
        
        const retval: SessionLocationRow[] = [];
        const topicFolder = currentSetting.value?.topicFolders[Topics.Location];

        if (!topicFolder)
          return [];

        for (const item of items) {
          const entry = await topicFolder.findEntry(item.uuid);

          if (!entry)
            continue;

          const parentId = await entry.getParentId();
          const parent = parentId ? await Entry.fromUuid(parentId) : null;

          retval.push({
            uuid: item.uuid,
            groupId: item.groupId,
            delivered: item.delivered,
            name: entry.name,
            type: entry.type,
            parent: parent?.name || '',
            parentId: parent?.uuid || null,
            notes: item.notes || '',
          });
        }

        return retval;
      }
    );

  // NPC rows with mapping to display rows
  const { rows: npcRows, groups: npcGroups, refresh: _refreshNPCs } = 
    useGroupedTableState(currentSession, 'npcs', GroupableItem.SessionNPCs,
      async (items: SessionNPC[]): Promise<SessionNPCRow[]> => {
        if (!currentSession.value || !currentSetting.value)
          return [];
        
        const retval: SessionNPCRow[] = [];
        const topicFolder = currentSetting.value?.topicFolders[Topics.Character];

        if (!topicFolder)
          return [];

        for (const item of items) {
          const entry = await topicFolder.findEntry(item.uuid);

          if (!entry) continue;

          // Use manual actor if present, otherwise fall back to tag-associated actor
          const draggableId = 
            entry.actors?.[0] || 
            entry.getFoundryTags(SettingKey.actorTags)?.[0]?.uuid || 
            undefined;

          retval.push({
            uuid: item.uuid,
            delivered: item.delivered,
            name: entry.name,
            type: entry.type,
            notes: item.notes || '',
            groupId: item.groupId,
            draggableId,
            dragTooltip: draggableId ? localize('tooltips.dragToScene') : undefined,
          });
        }

        return retval;
      }
    );

  // Monster rows with mapping to display rows
  const {rows: monsterRows, groups: monsterGroups, refresh: _refreshMonsters} = 
    useGroupedTableState(currentSession, 'monsters', GroupableItem.SessionMonsters,
      async (items: SessionMonster[]): Promise<SessionMonsterRow[]> => {
        if (!currentSession.value)
          return [];
        
        const retval: SessionMonsterRow[] = [];

        for (const item of items) {
          const entry = await foundry.utils.fromUuid<Actor>(item.uuid);

          if (entry) {
            retval.push({
              uuid: item.uuid,
              groupId: item.groupId,
              delivered: item.delivered,
              number: item.number,
              notes: item.notes || '',
              name: entry.name,
              draggableId: item.uuid,
              dragTooltip: localize('tooltips.dragToScene'),
            });
          } else {
            // the actor was deleted - remove it from our session
            await currentSession.value.deleteMonster(item.uuid);
          }
        }

        return retval;
      }
    );

  // Item rows with mapping to display rows
  const { rows: itemRows, groups: itemGroups, refresh: _refreshItems } = 
    useGroupedTableState(currentSession, 'items', GroupableItem.SessionItems,
      async (items: SessionItem[]): Promise<SessionItemRow[]> => {
        if (!currentSession.value)
          return [];
        
        const retval: SessionItemRow[] = [];

        for (const item of items) {
          const entry = await foundry.utils.fromUuid<Item>(item.uuid);

          if (entry) {
            retval.push({
              uuid: item.uuid,
              delivered: item.delivered,
              name: entry.name,
              notes: item.notes || '',
              draggableId: item.uuid,
              dragTooltip: localize('tooltips.dragItemFromSession'),
              groupId: item.groupId,
            });
          } else {
            // the item was deleted - remove it from our session
            await currentSession.value.deleteItem(item.uuid);
          }
        }

        return retval;
      }
    );

  // PC rows - pulled from campaign, using campaign's groups
  // Create a computed ref that resolves to the campaign
  const pcCampaignEntity = computed(() => 
    currentSession.value?.campaign
  );

  const { rows: pcRows, groups: pcGroups, refresh: _refreshPCs } = 
    useGroupedTableState(pcCampaignEntity, 'pcs', GroupableItem.CampaignPCs,
      async (items: CampaignPC[]): Promise<CampaignPCRow[]> => {
        // Get the campaign
        const campaign = currentSession.value?.campaign;
        
        if (!campaign)
          return [];

        const pcs = (await campaign.getPCs()) || [];

        return items.map((item: CampaignPC): CampaignPCRow | null => {
          const pc = pcs.find((p) => p.uuid === item.uuid);
          if (!pc) return null;

          return {
            uuid: item.uuid,
            groupId: item.groupId || null,
            type: 'PC',
            name: `${pc.name} (${pc.playerName})`,
            actor: pc.name,
            playerName: pc.playerName,
            actorId: item.actorId,
          } as CampaignPCRow;
        }).filter((row): row is CampaignPCRow => !!row);
      }
    );

  // watchers to rebuild rows
  watch(() => currentSession.value, async () => {
    await _refreshRowsForTab();
  });

  watch(() => currentContentTab.value, async () => {
    await _refreshRowsForTab();
  });

  /** Refresh rows for the currently active tab */
  const _refreshRowsForTab = async (): Promise<void> => {
    switch (currentContentTab.value) {
      case 'notes':
        break;
      case 'lore':
        await _refreshLore();
        break;
      case 'vignettes':
        await _refreshVignettes();
        break;
      case 'locations':
        await _refreshLocations();
        break;
      case 'npcs':
        await _refreshNPCs();
        break;
      case 'monsters':
        await _refreshMonsters();
        break;
      case 'magic':
        await _refreshItems();
        break;
      case 'pcs':
        await _refreshPCs();
        break;
      default:
        break;
    }
  };

  return {
    locationRows,
    locationGroups,
    itemRows,
    itemGroups,
    npcRows,
    npcGroups,
    monsterRows,
    monsterGroups,
    vignetteRows,
    vignetteGroups,
    loreRows,
    loreGroups,
    pcRows,
    pcGroups,
  };
}
