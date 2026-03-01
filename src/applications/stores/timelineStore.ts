// Thin facade store for timeline operations.
// The actual vis-timeline state and logic lives in the per-panel composable
// useTimelineState. This store exists so external callers can still interact
// with timelines (e.g., refresh all timelines when Calendaria notes change).

// local imports
import type { TimelineState } from '@/composables/useTimelineState';

// the store definition
export const timelineStore = () => {
  const _timelineStates = new Map<number, TimelineState>();

  /**
   * Register a panel's timeline state so the store can delegate to it.
   * @param panelIndex - The panel index this state belongs to
   * @param state - The composable instance
   */
  const registerTimelineState = (panelIndex: number, state: TimelineState) => {
    _timelineStates.set(panelIndex, state);
  };

  /**
   * Unregister a panel's timeline state on cleanup.
   * @param panelIndex - The panel index to remove
   */
  const unregisterTimelineState = (panelIndex: number) => {
    _timelineStates.delete(panelIndex);
  };

  /**
   * Refresh all registered timelines.
   * Called when Calendaria notes may have changed and all timelines need updating.
   */
  const refreshAllTimelines = async () => {
    for (const [_, state] of _timelineStates) {
      await state.refreshTimeline();
    }
  };

  return {
    registerTimelineState,
    unregisterTimelineState,
    refreshAllTimelines,
  };
};
