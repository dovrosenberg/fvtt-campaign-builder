// Composable that provides per-panel derived state for arc content.
// Each panel that renders arc content creates its own instance, so table rows
// are scoped to that panel rather than shared globally.

// library imports
import { ref, watch, type InjectionKey, type Ref } from 'vue';

// local imports
import { useContentState } from '@/composables/useContentState';
import { Entry } from '@/classes';
import { getTopicText } from '@/compendia';

// types
import type {
  ArcLocationDetails,
  ArcParticipantDetails,
  ArcMonsterDetails,
  ArcLoreDetails,
  ArcVignetteDetails,
  Idea,
} from '@/types';
import type { ArcVignette } from '@/documents';

export interface ArcDerivedState {
  locationRows: Ref<ArcLocationDetails[]>;
  participantRows: Ref<ArcParticipantDetails[]>;
  monsterRows: Ref<ArcMonsterDetails[]>;
  vignetteRows: Ref<ArcVignetteDetails[]>;
  loreRows: Ref<ArcLoreDetails[]>;
  ideaRows: Ref<Idea[]>;
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

  // table row state
  const locationRows = ref<ArcLocationDetails[]>([]);
  const participantRows = ref<ArcParticipantDetails[]>([]);
  const monsterRows = ref<ArcMonsterDetails[]>([]);
  const vignetteRows = ref<ArcVignetteDetails[]>([]);
  const loreRows = ref<ArcLoreDetails[]>([]);
  const ideaRows = ref<Idea[]>([]);

  // watchers to rebuild rows
  watch(() => currentArc.value, async () => {
    await _refreshRowsForTab();
  });

  watch(() => currentContentTab.value, async () => {
    await _refreshRowsForTab();
  });

  // internal refresh functions (moved from arcStore)
  /** Refresh location rows from the arc */
  const _refreshLocationRows = async (): Promise<void> => {
    if (!currentArc.value)
      return;

    const retval = [] as ArcLocationDetails[];

    for (const location of currentArc.value?.locations) {
      const entry = await Entry.fromUuid(location.uuid);

      if (!entry)
        continue;

      const parentId = await entry.getParentId();
      const parent = parentId ? await Entry.fromUuid(parentId) : null;

      if (entry) {
        retval.push({
          uuid: location.uuid,
          name: entry.name,
          type: entry.type,
          parent: parent?.name || '',
          parentId: parent?.uuid || null,
          notes: location.notes,
        });
      }
    }

    locationRows.value = retval;
  };

  /** Refresh participant rows from the arc */
  const _refreshParticipantRows = async (): Promise<void> => {
    if (!currentArc.value)
      return;

    // note these can be character or organization
    const retval = [] as ArcParticipantDetails[];

    for (const participant of currentArc.value?.participants) {
      const entry = await Entry.fromUuid(participant.uuid);

      if (entry) {
        retval.push({
          uuid: participant.uuid,
          name: entry.name,
          type: entry.type || getTopicText(entry.topic),
          notes: participant.notes
        });
      }
    }

    participantRows.value = retval;
  };

  /** Refresh monster rows from the arc */
  const _refreshMonsterRows = async (): Promise<void> => {
    if (!currentArc.value)
      return;

    const retval = [] as ArcMonsterDetails[];

    for (const monster of currentArc.value?.monsters) {
      const entry = await fromUuid<Actor>(monster.uuid);

      if (entry) {
        retval.push({
          uuid: monster.uuid,
          name: entry.name,
          notes: monster.notes
        });
      } else {
        // the actor was deleted - remove it from our arc
        await currentArc.value.deleteMonster(monster.uuid);
      }
    }

    monsterRows.value = retval;
  };

  /** Refresh idea rows from the arc */
  const _refreshIdeaRows = async (): Promise<void> => {
    ideaRows.value = [];

    if (!currentArc.value)
      return;

    ideaRows.value = currentArc.value.ideas.slice();
  };

  /** Refresh lore rows from the arc */
  const _refreshLoreRows = async (): Promise<void> => {
    if (!currentArc.value)
      return;

    const retval = [] as ArcLoreDetails[];

    for (const lore of currentArc.value?.lore) {
      retval.push({
        uuid: lore.uuid,
        description: lore.description,
      });
    }

    loreRows.value = retval;
  };

  /** Refresh vignette rows from the arc */
  const _refreshVignetteRows = async (): Promise<void> => {
    if (!currentArc.value)
      return;

    const vignettes = (currentArc.value.vignettes as ArcVignette[] | undefined) || [];
    vignetteRows.value = vignettes.map((v) => ({
      uuid: v.uuid,
      description: v.description,
    }));
  };

  /** Refresh rows for the currently active tab */
  const _refreshRowsForTab = async (): Promise<void> => {
    switch (currentContentTab.value) {
      case 'description':
        break;
      case 'ideas':
        await _refreshIdeaRows();
        break;
      case 'vignettes':
        await _refreshVignetteRows();
        break;
      case 'lore':
        await _refreshLoreRows();
        break;
      case 'locations':
        await _refreshLocationRows();
        break;
      case 'participants':
        await _refreshParticipantRows();
        break;
      case 'monsters':
        await _refreshMonsterRows();
        break;
      default:
        break;
    }
  };

  return {
    locationRows,
    participantRows,
    monsterRows,
    vignetteRows,
    loreRows,
    ideaRows,
  };
}
