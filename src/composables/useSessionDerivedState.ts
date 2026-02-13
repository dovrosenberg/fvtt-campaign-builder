// Composable that provides per-panel derived state for session content.
// Each panel that renders session content creates its own instance, so table rows
// are scoped to that panel rather than shared globally.

// library imports
import { ref, watch, type InjectionKey, type Ref } from 'vue';

// local imports
import { useContentState } from '@/composables/useContentState';
import { Entry } from '@/classes';
import { localize } from '@/utils/game';

// types
import {
  Topics,
} from '@/types';
import type {
  SessionLocationDetails,
  SessionItemDetails,
  SessionNPCDetails,
  SessionMonsterDetails,
  SessionLoreDetails,
} from '@/types';
import type { SessionVignette } from '@/documents';

export interface SessionDerivedState {
  relatedLocationRows: Ref<SessionLocationDetails[]>;
  relatedEntryRows: Ref<SessionItemDetails[]>;
  relatedNPCRows: Ref<SessionNPCDetails[]>;
  relatedMonsterRows: Ref<SessionMonsterDetails[]>;
  vignetteRows: Ref<SessionVignette[]>;
  loreRows: Ref<SessionLoreDetails[]>;
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

  // table row state
  const relatedLocationRows = ref<SessionLocationDetails[]>([]);
  const relatedEntryRows = ref<SessionItemDetails[]>([]);
  const relatedNPCRows = ref<SessionNPCDetails[]>([]);
  const relatedMonsterRows = ref<SessionMonsterDetails[]>([]);
  const vignetteRows = ref<SessionVignette[]>([]);
  const loreRows = ref<SessionLoreDetails[]>([]);

  // watchers to rebuild rows
  watch(() => currentSession.value, async () => {
    await _refreshRowsForTab();
  });

  watch(() => currentContentTab.value, async () => {
    await _refreshRowsForTab();
  });

  // internal refresh functions (moved from sessionStore)
  /** Refresh location rows from the session */
  const _refreshLocationRows = async (): Promise<void> => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionLocationDetails[];
    const topicFolder = currentSetting.value?.topicFolders[Topics.Location];

    if (!topicFolder)
      throw new Error('Invalid topic folder in useSessionDerivedState._refreshLocationRows()');

    for (const location of currentSession.value?.locations) {
      const entry = await topicFolder.findEntry(location.uuid);

      if (!entry)
        continue;

      const parentId = await entry.getParentId();
      const parent = parentId ? await Entry.fromUuid(parentId) : null;

      if (entry) {
        retval.push({
          uuid: location.uuid,
          delivered: location.delivered,
          name: entry.name,
          type: entry.type,
          parent: parent?.name || '',
          parentId: parent?.uuid || null,
          notes: location.notes || '',
        });
      }
    }

    relatedLocationRows.value = retval;
  };

  /** Refresh NPC rows from the session */
  const _refreshNPCRows = async (): Promise<void> => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionNPCDetails[];
    const topicFolder = currentSetting.value?.topicFolders[Topics.Character];

    if (!topicFolder)
      throw new Error('Invalid topic folder in useSessionDerivedState._refreshNPCRows()');

    for (const npc of currentSession.value?.npcs) {
      const entry = await topicFolder.findEntry(npc.uuid);

      if (entry) {
        retval.push({
          uuid: npc.uuid,
          delivered: npc.delivered,
          name: entry.name,
          type: entry.type,
          notes: npc.notes || '',
        });
      }
    }

    relatedNPCRows.value = retval;
  };

  /** Refresh magic item rows from the session */
  const _refreshItemRows = async (): Promise<void> => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionItemDetails[];

    for (const item of currentSession.value?.items) {
      const entry = await fromUuid<Item>(item.uuid);

      if (entry) {
        retval.push({
          uuid: item.uuid,
          delivered: item.delivered,
          name: entry.name,
          notes: item.notes || '',
          dragTooltip: localize('tooltips.dragItemFromSession'),
        });
      } else {
        // the item was deleted - remove it from our session
        await currentSession.value.deleteItem(item.uuid);
      }
    }

    relatedEntryRows.value = retval;
  };

  /** Refresh monster rows from the session */
  const _refreshMonsterRows = async (): Promise<void> => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionMonsterDetails[];

    for (const monster of currentSession.value?.monsters) {
      const entry = await fromUuid<Actor>(monster.uuid);

      if (entry) {
        retval.push({
          uuid: monster.uuid,
          delivered: monster.delivered,
          number: monster.number,
          notes: monster.notes || '',
          name: entry.name,
          dragTooltip: localize('tooltips.dragMonsterFromSession'),
        });
      } else {
        // the actor was deleted - remove it from our session
        await currentSession.value.deleteMonster(monster.uuid);
      }
    }

    relatedMonsterRows.value = retval;
  };

  /** Refresh vignette rows from the session */
  const _refreshVignetteRows = async (): Promise<void> => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionVignette[];

    for (const vignette of (currentSession.value?.vignettes || [])) {
      retval.push({
        uuid: vignette.uuid,
        delivered: vignette.delivered,
        description: vignette.description,
      });
    }

    vignetteRows.value = retval;
  };

  /** Refresh lore rows from the session */
  const _refreshLoreRows = async (): Promise<void> => {
    if (!currentSession.value)
      return;

    const retval = [] as SessionLoreDetails[];

    for (const lore of currentSession.value?.lore) {
      retval.push({
        uuid: lore.uuid,
        delivered: lore.delivered,
        significant: lore.significant,
        description: lore.description,
      });
    }

    loreRows.value = retval;
  };

  /** Refresh rows for the currently active tab */
  const _refreshRowsForTab = async (): Promise<void> => {
    switch (currentContentTab.value) {
      case 'notes':
        break;
      case 'lore':
        await _refreshLoreRows();
        break;
      case 'vignettes':
        await _refreshVignetteRows();
        break;
      case 'locations':
        await _refreshLocationRows();
        break;
      case 'npcs':
        await _refreshNPCRows();
        break;
      case 'monsters':
        await _refreshMonsterRows();
        break;
      case 'magic':
        await _refreshItemRows();
        break;
      case 'pcs':
        // handled by campaignDerivedState
        break;
      default:
        break;
    }
  };

  return {
    relatedLocationRows,
    relatedEntryRows,
    relatedNPCRows,
    relatedMonsterRows,
    vignetteRows,
    loreRows,
  };
}
