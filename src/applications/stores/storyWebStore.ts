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
// Initialize global physics options with current defaults
// @ts-ignore
window.fcbStoryWebPhysics = {
  solver: 'barnesHut',
  barnesHut: {
    avoidOverlap: 0.5,        // ensure nodes don't overlap
    springLength: 100,      // "rest" length of edges (shorter = tighter cluster)
    springConstant: .002,  //0.01,  // how strong springs pull (higher = neighbors move more)
    gravitationalConstant: -1550,  //-500,  //-3500, // -3500 // how strongly nodes repel (more negative = more push)
    centralGravity: .05, //1,  //0.3,    // pulls everything toward center (higher = more drift)
    damping: .1,  //0.09,          // friction (higher = motion dies out faster)
  },
  // repulsion: {
  //   nodeDistance: 100,
  //   springLength: 100,      // "rest" length of edges (shorter = tighter cluster)
  //   springConstant: 0.03,  // how strong springs pull (higher = neighbors move more)
  //   centralGravity: 0.05,    // pulls everything toward center (higher = more drift)
  //   damping: .3,            // friction (higher = motion dies out faster)
  // },
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
    regenerateAllGraphs,
  };
};
