// Composable that provides per-panel derived state for front content.
// Each panel that renders front content creates its own instance, so table rows
// and danger selection are scoped to that panel rather than shared globally.

// library imports
import { ref, computed, watch, type InjectionKey, type Ref, type ComputedRef } from 'vue';

// local imports
import { useContentState } from '@/composables/useContentState';

// types
import type { DangerParticipant, GrimPortent, Danger } from '@/types';

export interface FrontDerivedState {
  participantRows: Ref<(DangerParticipant & { name: string; type: string })[]>;
  grimPortentRows: Ref<GrimPortent[]>;
  currentDangerIndex: ComputedRef<number | null>;
  currentDanger: ComputedRef<Danger | null>;
}

export const FRONT_DERIVED_STATE_KEY: InjectionKey<FrontDerivedState> = Symbol('frontDerivedState');

/**
 * Creates panel-scoped derived state for front content (danger selection, table rows).
 * Must be called inside a component that is a descendant of a TabPanel (or fallback context).
 * @returns Reactive refs for participant rows, grim portent rows, and current danger info.
 */
export function useFrontDerivedState(): FrontDerivedState {
  // get panel-scoped content refs
  const { currentFront, currentContentTab, currentSetting } = useContentState();

  // derived computeds
  const currentDangerIndex = computed(() => {
    if (!currentFront.value || currentContentTab.value == null)
      return null;

    // danger tabs are keyed as 'danger0', 'danger1', etc.
    const index = parseInt(currentContentTab.value.toString().replace('danger', ''));
    if (isNaN(index) || index < 0 || index >= currentFront.value.dangers.length)
      return null;

    return index;
  });

  const currentDanger = computed(() => {
    if (!currentFront.value || currentDangerIndex.value == null)
      return null;

    return currentFront.value.dangers[currentDangerIndex.value];
  });

  // table row state
  const participantRows = ref<(DangerParticipant & { name: string; type: string })[]>([]);
  const grimPortentRows = ref<GrimPortent[]>([]);

  // watchers to rebuild rows when danger changes
  watch(() => currentFront.value, async () => {
    await _refreshDangerRows();
  });

  watch(() => currentContentTab.value, async () => {
    await _refreshDangerRows();
  });

  // internal refresh functions (moved from frontStore)
  /** Force reactive update of participant table rows */
  const _refreshParticipantRows = async (): Promise<void> => {
    participantRows.value = [];

    if (!currentDanger.value || !currentSetting.value)
      return;

    for (const p of currentDanger.value.participants) {
      // get it from the setting because we don't know topic
      const items = await currentSetting.value.filterEntries((e) => e.uuid === p.uuid);

      if (items.length === 0)
        throw new Error('Invalid uuid in useFrontDerivedState._refreshParticipantRows');

      participantRows.value.push({
        uuid: p.uuid,
        name: items[0].name,
        type: items[0].type,
        role: p.role,
      });
    }
  };

  /** Force reactive update of grim portent table rows */
  const _refreshPortentRows = (): void => {
    grimPortentRows.value = [];

    if (!currentDanger.value)
      return;

    grimPortentRows.value = [...currentDanger.value.grimPortents];
  };

  /** Refresh both participant and portent rows */
  const _refreshDangerRows = async (): Promise<void> => {
    await _refreshParticipantRows();
    _refreshPortentRows();
  };

  return {
    participantRows,
    grimPortentRows,
    currentDangerIndex,
    currentDanger,
  };
}
