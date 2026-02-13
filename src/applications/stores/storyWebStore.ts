// Thin facade store for story web operations.
// The actual vis-network state and logic lives in the per-panel composable
// useStoryWebGraphState. This store exists so external callers (directory
// context menus) that can't inject the composable can still add entries/fronts
// to the currently focused panel's story web.
//
// library imports

// local imports
import { useNavigationStore } from '@/applications/stores';

// types
import type { StoryWebGraphState } from '@/composables/useStoryWebGraphState';

// Global physics options for console debugging and tuning
// @ts-ignore
window.fcbStoryWebPhysics = {
  solver: 'barnesHut',
  barnesHut: {
    avoidOverlap: 0.5,
    springLength: 100,
    springConstant: .002,
    gravitationalConstant: -1550,
    centralGravity: .05,
    damping: .1,
  },
  stabilization: {
    enabled: true,
    onlyDynamicEdges: false,
    updateInterval: 1,
    fit: false,
  },
  maxVelocity: 50,
  minVelocity: 1
};

// the store definition
export const storyWebStore = () => {
  const navigationStore = useNavigationStore();
  const _graphStates = new Map<number, StoryWebGraphState>();

  /**
   * Register a panel's graph state so the store can delegate to it.
   * @param panelIndex - The panel index this state belongs to
   * @param state - The composable instance
   */
  const registerGraphState = (panelIndex: number, state: StoryWebGraphState) => {
    _graphStates.set(panelIndex, state);
  };

  /**
   * Unregister a panel's graph state on cleanup.
   * @param panelIndex - The panel index to remove
   */
  const unregisterGraphState = (panelIndex: number) => {
    _graphStates.delete(panelIndex);
  };

  /** Get the graph state for the currently focused panel. */
  const _getFocusedGraphState = (): StoryWebGraphState | undefined => {
    return _graphStates.get(navigationStore.focusedPanelIndex);
  };

  /**
   * Add entry to the focused panel's story web (used by directory context menus).
   * @param uuid - UUID of the entry to add
   * @param position - Position to place the node at (canvas coordinates)
   * @param withRelationships - Whether to also add all related nodes implicitly
   */
  const addEntry = async (uuid: string, position: { x: number; y: number } | null = null, withRelationships = false) => {
    await _getFocusedGraphState()?.addEntry(uuid, position, withRelationships);
  };

  /**
   * Add front to the focused panel's story web (used by directory context menus).
   * @param frontId - UUID of the front to add
   * @param position - Position to place the first danger at (canvas coordinates)
   * @param withRelationships - Whether to also add all related nodes implicitly
   */
  const addFront = async (frontId: string, position: { x: number; y: number } | null = null, withRelationships = false) => {
    await _getFocusedGraphState()?.addFront(frontId, position, withRelationships);
  };

  /**
   * Regenerate active story web graphs that use the given content.
   * Called by the updateJournalEntryPage hook so that story webs pick up
   * changes to entries/fronts displayed in their graphs.
   * @param contentUuid - If provided, only regenerate webs that reference this UUID
   */
  const regenerateAllGraphs = async (contentUuid?: string) => {
    for (const [_, state] of _graphStates) {
      await state.regenerate(contentUuid);
    }
  };

  return {
    registerGraphState,
    unregisterGraphState,
    addEntry,
    addFront,
    regenerateAllGraphs,
  };
};
