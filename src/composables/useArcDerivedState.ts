// Composable that provides per-panel derived state for arc content.
// Each panel that renders arc content creates its own instance, so table rows
// are scoped to that panel rather than shared globally.

// library imports
import { watch, type InjectionKey, type Ref } from 'vue';

// local imports
import { useContentState } from '@/composables/useContentState';
import { useGroupedTableState } from '@/composables/useGroupedTableState';

// types
import {
  ArcIdeaRow,
  ArcItemRow,
  ArcLocationRow,
  ArcLoreRow,
  ArcMonsterRow,
  ArcParticipantRow,
  ArcVignetteRow,
  Topics,
  TableGroup,
  ArcParticipant,
  ArcMonster,
  ArcItem,
  GroupableItem,
} from '@/types';
import { getTopicText } from '@/compendia';
import { useMainStore } from '@/applications/stores';
import { Entry } from '@/classes';

export interface ArcDerivedState {
  locationRows: Ref<ArcLocationRow[]>;
  locationGroups: Ref<TableGroup[]>;
  participantRows: Ref<ArcParticipantRow[]>;
  participantGroups: Ref<TableGroup[]>;
  monsterRows: Ref<ArcMonsterRow[]>;
  monsterGroups: Ref<TableGroup[]>;
  itemRows: Ref<ArcItemRow[]>;
  itemGroups: Ref<TableGroup[]>;
  vignetteRows: Ref<ArcVignetteRow[]>;
  vignetteGroups: Ref<TableGroup[]>;
  loreRows: Ref<ArcLoreRow[]>;
  loreGroups: Ref<TableGroup[]>;
  ideaRows: Ref<ArcIdeaRow[]>;
  ideaGroups: Ref<TableGroup[]>;
}

export const ARC_DERIVED_STATE_KEY: InjectionKey<ArcDerivedState> = Symbol('arcDerivedState');

/**
 * Creates panel-scoped derived state for arc content (locations, participants, monsters, etc.).
 * Must be called inside a component that is a descendant of a TabPanel (or fallback context).
 * @returns Reactive refs for all arc table row data.
 */
export function useArcDerivedState(): ArcDerivedState {
  // get panel-scoped content refs
  const { currentArc, currentContentTab } = useContentState();

  // Use unified grouped table state for grouped tables
  const { rows: ideaRows, groups: ideaGroups, refresh: _refreshIdeas } = 
    useGroupedTableState(currentArc, 'ideas', GroupableItem.ArcIdeas);
  const { rows: loreRows, groups: loreGroups, refresh: _refreshLore } = 
    useGroupedTableState(currentArc, 'lore', GroupableItem.ArcLore);
  const { rows: vignetteRows, groups: vignetteGroups, refresh: _refreshVignettes } = 
    useGroupedTableState(currentArc, 'vignettes', GroupableItem.ArcVignettes);
  const { rows: locationRows, groups: locationGroups, refresh: _refreshLocations } = 
    useGroupedTableState(currentArc, 'locations', GroupableItem.ArcLocations);
  const { rows: participantRows, groups: participantGroups, refresh: _refreshParticipants } =
    useGroupedTableState(currentArc, 'participants', GroupableItem.ArcParticipants,
    async (items: ArcParticipant[]): Promise<ArcParticipantRow[]> => {
      const retval: ArcParticipantRow[] = [];

      for (const item of items) {
        // get the entry 
        const entry = await Entry.fromUuid(item.uuid);
        if (!entry)
          continue;

        const isChar = isEntryCharacter(item.uuid);

        retval.push({
          uuid: item.uuid,
          groupId: item.groupId || null,
          name: entry.name,
          notes: item.notes,
          topic: isChar ? Topics.Character : Topics.Organization,
          type: entry.type || (isChar ? getTopicText(Topics.Character) : getTopicText(Topics.Organization)),
        });
      }

      return retval;
    }
  );

  const { rows: monsterRows, groups: monsterGroups, refresh: _refreshMonsters } = 
    useGroupedTableState(currentArc, 'monsters', GroupableItem.ArcMonsters,
    async (items: ArcMonster[]): Promise<ArcMonsterRow[]> => {
      if (!currentArc.value)
        return [];
      
      const retval: ArcMonsterRow[] = [];

      for (const item of items) {
        const actor = await foundry.utils.fromUuid<Actor>(item.uuid);

        if (actor) {
          retval.push({
            uuid: item.uuid,
            groupId: item.groupId || null,
            name: actor.name,
            notes: item.notes || '',
          });
        }
      }

      return retval;
    }
  );

  const { rows: itemRows, groups: itemGroups, refresh: _refreshItems } = 
    useGroupedTableState(currentArc, 'items', GroupableItem.ArcItems,
    async (items: ArcItem[]): Promise<ArcItemRow[]> => {
      if (!currentArc.value)
        return [];
      
      const retval: ArcItemRow[] = [];

      for (const item of items) {
        const itemDoc = await foundry.utils.fromUuid<Item>(item.uuid);

        if (itemDoc) {
          retval.push({
            uuid: item.uuid,
            groupId: item.groupId || null,
            name: itemDoc.name,
            notes: item.notes || '',
          });
        }
      }

      return retval;
    }
  );

  // methods
  const isEntryCharacter = (uuid: string) => {
    const setting = useMainStore().currentSetting;

    if (!setting)
      throw new Error ('No current setting found in useArcDerivedState.isEntryCharacter()');

    // see if it's in the characters topic
    return setting.topics[Topics.Character]?.entries.some((entry) => entry.uuid === uuid);
  }

  // watchers to rebuild rows
  watch(() => currentArc.value, async () => {
    await _refreshRowsForTab();
  });

  watch(() => currentContentTab.value, async () => {
    await _refreshRowsForTab();
  });

  /** Refresh rows for the currently active tab */
  const _refreshRowsForTab = async (): Promise<void> => {
    switch (currentContentTab.value) {
      case 'description':
        break;
      case 'ideas':
        await _refreshIdeas();
        break;
      case 'vignettes':
        await _refreshVignettes();
        break;
      case 'lore':
        await _refreshLore();
        break;
      case 'locations':
        await _refreshLocations();
        break;
      case 'participants':
        await _refreshParticipants();
        break;
      case 'monsters':
        await _refreshMonsters();
        break;
      case 'items':
        await _refreshItems();
        break;
      default:
        break;
    }
  };

  return {
    locationRows,
    locationGroups,
    participantRows,
    participantGroups,
    monsterRows,
    monsterGroups,
    itemRows,
    itemGroups,
    vignetteRows,
    vignetteGroups,
    loreRows,
    loreGroups,
    ideaRows,
    ideaGroups,
  };
}
