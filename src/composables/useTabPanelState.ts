// Composable that creates per-panel content state for the multi-panel TabPanel system.
// Each TabPanel instance creates its own TabPanelState via createTabPanelState().
// Content components inject this state to get panel-scoped current* refs.

// library imports
import { computed, ref, triggerRef, nextTick, type ComputedRef, type WritableComputedRef, type Ref, type InjectionKey } from 'vue';

// local imports
import { useNavigationStore } from '@/applications/stores';

// types
import { Topics, WindowTabType } from '@/types';
import { WindowTab, Entry, Campaign, Session, Front, Arc, StoryWeb } from '@/classes';

/**
 * Interface for per-panel content state. Mirrors the content-specific parts of mainStore.
 */
export interface TabPanelState {
  // panel identity (mutable ref — updated by navigationStore during panel re-indexing)
  panelIndex: Ref<number>;

  // content state refs
  // note that currentSetting is on main store because it's global
  currentEntry: ComputedRef<Entry | null>;
  currentCampaign: ComputedRef<Campaign | null>;
  currentSession: ComputedRef<Session | null>;
  currentArc: ComputedRef<Arc | null>;
  currentFront: ComputedRef<Front | null>;
  currentStoryWeb: ComputedRef<StoryWeb | null>;
  currentTab: ComputedRef<WindowTab | null>;
  currentContentType: ComputedRef<WindowTabType>;
  currentContentId: ComputedRef<string | null>;
  currentContentTab: WritableComputedRef<string | null>;
  currentTag: ComputedRef<{ value: string | null }>;
  currentEntryTopic: ComputedRef<Topics>;
  refreshCurrentEntry: Ref<boolean>;

  // actions
  setNewTab(tab: WindowTab): Promise<void>;
  refreshEntry(): Promise<void>;
  refreshCampaign(): Promise<void>;
  refreshSession(reload?: boolean): Promise<void>;
  refreshArc(reload?: boolean): Promise<void>;
  refreshFront(): Promise<void>;
  refreshStoryWeb(): Promise<void>;
  refreshCurrentContent(): Promise<void>;
  refreshTagResults(): Promise<void>;
}

/** Injection key for TabPanelState, provided by TabPanel and injected by content components. */
export const TAB_PANEL_STATE_KEY: InjectionKey<TabPanelState> = Symbol('tabPanelState');

/**
 * Creates a new TabPanelState instance for a specific panel.
 * Each TabPanel calls this once on mount and provides the result to its descendants.
 *
 * @param panelIndex - The index of the panel this state belongs to
 * @returns A new TabPanelState with independent content refs
 */
export function createTabPanelState(initialPanelIndex: number): TabPanelState {
  // internal refs
  const panelIndex = ref<number>(initialPanelIndex);
  const _currentEntry = ref<Entry | null>(null);
  const _currentCampaign = ref<Campaign | null>(null);
  const _currentSession = ref<Session | null>(null);
  const _currentArc = ref<Arc | null>(null);
  const _currentFront = ref<Front | null>(null);
  const _currentStoryWeb = ref<StoryWeb | null>(null);
  const _currentTab = ref<WindowTab | null>(null);
  const _currentTag = ref<{ value: string | null }>({ value: null });

  // public computed refs
  const currentEntry = computed((): Entry | null => (_currentEntry?.value || null) as Entry | null);
  const currentCampaign = computed((): Campaign | null => (_currentCampaign?.value || null) as Campaign | null);
  const currentSession = computed((): Session | null => (_currentSession?.value || null) as Session | null);
  const currentArc = computed((): Arc | null => (_currentArc?.value || null) as Arc | null);
  const currentFront = computed((): Front | null => (_currentFront?.value || null) as Front | null);
  const currentStoryWeb = computed((): StoryWeb | null => (_currentStoryWeb?.value || null) as StoryWeb | null);
  const currentTab = computed((): WindowTab | null => _currentTab?.value);
  const currentContentType = computed((): WindowTabType => _currentTab?.value?.tabType || WindowTabType.NewTab);
  const currentTag = computed((): { value: string | null } => _currentTag?.value || { value: null });

  const currentContentId = computed((): string | null => {
    return _currentEntry.value ? _currentEntry.value.uuid :
      _currentCampaign.value ? _currentCampaign.value.uuid :
      _currentSession.value ? _currentSession.value.uuid :
      _currentArc.value ? _currentArc.value.uuid :
      _currentFront.value ? _currentFront.value.uuid :
      _currentStoryWeb.value ? _currentStoryWeb.value.uuid :
      null;
  });

  const currentEntryTopic = computed((): Topics => {
    if (!currentEntry.value)
      return Topics.None;
    return currentEntry.value.topic || Topics.None;
  });

  const refreshCurrentEntry = ref<boolean>(false);

  // writable computed for the content sub-tab
  const currentContentTab = computed({
    get: (): string | null => _currentTab.value?.contentTab || null,
    set: (newContentTab: string) => {
      if (_currentTab.value) {
        _currentTab.value.contentTab = newContentTab;
        void useNavigationStore().updateContentTab(newContentTab, panelIndex.value);
      }
    }
  });

  /**
   * Loads the content associated with the specified tab and populates the panel's refs.
   * This is the per-panel equivalent of mainStore.setNewTab().
   *
   * @param tab - The WindowTab to load content for
   */
  const setNewTab = async function (tab: WindowTab): Promise<void> {
    await nextTick();
    _currentTab.value = tab;

    // force reactivity update even if same tab object
    triggerRef(_currentTab);

    // clear everything
    _currentEntry.value = null;
    _currentCampaign.value = null;
    _currentSession.value = null;
    _currentArc.value = null;
    _currentFront.value = null;
    _currentStoryWeb.value = null;
    _currentTag.value = { value: null };

    switch (tab.tabType) {
      case WindowTabType.Entry:
        if (tab.header.uuid) {
          _currentEntry.value = await Entry.fromUuid(tab.header.uuid);
          if (!_currentEntry.value)
            throw new Error(`Invalid entry uuid ${tab.header.uuid} in TabPanelState.setNewTab()`);
        }
        break;
      case WindowTabType.Setting:
        // nothing to load — setting is handled globally by mainStore
        break;
      case WindowTabType.Campaign:
        if (tab.header.uuid) {
          _currentCampaign.value = await Campaign.fromUuid(tab.header.uuid);
          if (!_currentCampaign.value)
            throw new Error(`Invalid campaign uuid ${tab.header.uuid} in TabPanelState.setNewTab()`);
        }
        break;
      case WindowTabType.Front:
        if (tab.header.uuid) {
          _currentFront.value = await Front.fromUuid(tab.header.uuid);
          if (!_currentFront.value)
            throw new Error(`Invalid front uuid ${tab.header.uuid} in TabPanelState.setNewTab()`);
        }
        break;
      case WindowTabType.Session:
        if (tab.header.uuid) {
          _currentSession.value = await Session.fromUuid(tab.header.uuid);
          if (!_currentSession.value)
            throw new Error(`Invalid session uuid ${tab.header.uuid} in TabPanelState.setNewTab()`);
        }
        break;
      case WindowTabType.Arc:
        if (tab.header.uuid) {
          _currentArc.value = await Arc.fromUuid(tab.header.uuid);
          if (!_currentArc.value)
            throw new Error(`Invalid arc uuid ${tab.header.uuid} in TabPanelState.setNewTab()`);
        }
        break;
      case WindowTabType.StoryWeb:
        if (tab.header.uuid) {
          _currentStoryWeb.value = await StoryWeb.fromUuid(tab.header.uuid);
          if (!_currentStoryWeb.value)
            throw new Error(`Invalid story web uuid ${tab.header.uuid} in TabPanelState.setNewTab()`);
        }
        break;
      case WindowTabType.TagResults:
        _currentTag.value.value = tab.header.uuid || null;
        if (!_currentTag.value.value)
          throw new Error('Invalid/missing tag in TabPanelState.setNewTab()');
        break;
      default:
        tab.tabType = WindowTabType.NewTab;
    }
  };

  /** Refreshes the current entry by re-creating from the raw document. */
  const refreshEntry = async function (): Promise<void> {
    if (!_currentEntry.value?.raw?.parent)
      return;
    _currentEntry.value = new Entry(_currentEntry.value.raw.parent as unknown as JournalEntry);
  };

  /** Refreshes the current campaign. */
  const refreshCampaign = async function (): Promise<void> {
    if (!_currentCampaign.value?.raw?.parent)
      return;
    _currentCampaign.value = new Campaign(_currentCampaign.value.raw.parent as unknown as JournalEntry);
  };

  /** Refreshes the current front. */
  const refreshFront = async function (): Promise<void> {
    if (!_currentFront.value?.raw?.parent)
      return;
    _currentFront.value = new Front(_currentFront.value.raw.parent as unknown as JournalEntry);
  };

  /** Refreshes the current story web.  Always reload because these are finicky */
  const refreshStoryWeb = async function (): Promise<void> {
    if (!_currentStoryWeb.value?.raw?.parent)
      return;
    
    const reloaded = await StoryWeb.fromUuid(_currentStoryWeb.value.uuid);
    if (reloaded) {
      _currentStoryWeb.value = reloaded;
    }
  };

  /** Refreshes the current tag results. */
  const refreshTagResults = async function (): Promise<void> {
    if (!_currentTag.value.value)
      return;
    _currentTag.value = { ..._currentTag.value };
  };

  /** Refreshes the current session. */
  const refreshSession = async function (reload = false): Promise<void> {
    if (!_currentSession.value?.raw?.parent)
      return;

    const campaign = await _currentSession.value.loadCampaign();
    if (reload)
      _currentSession.value = await Session.fromUuid(_currentSession.value.raw.parent.uuid);
    else
      _currentSession.value = new Session(_currentSession.value.raw.parent as unknown as JournalEntry, campaign || undefined);
  };

  /** Refreshes the current arc. */
  const refreshArc = async function (reload = false): Promise<void> {
    if (!_currentArc.value?.raw?.parent)
      return;

    const campaign = await _currentArc.value.loadCampaign();
    if (reload)
      _currentArc.value = await Arc.fromUuid(_currentArc.value.raw.parent.uuid);
    else
      _currentArc.value = new Arc(_currentArc.value.raw.parent as unknown as JournalEntry, campaign || undefined);
  };

  /** Refreshes whatever content is currently showing in this panel. */
  const refreshCurrentContent = async function (): Promise<void> {
    switch (currentContentType.value) {
      case WindowTabType.Entry:
        await refreshEntry();
        break;
      case WindowTabType.Campaign:
        await refreshCampaign();
        break;
      case WindowTabType.Session:
        await refreshSession();
        break;
      case WindowTabType.Arc:
        await refreshArc();
        break;
      case WindowTabType.Front:
        await refreshFront();
        break;
      case WindowTabType.StoryWeb:
        await refreshStoryWeb();
        break;
      case WindowTabType.TagResults:
        await refreshTagResults();
        break;
      default:
    }
  };

  return {
    panelIndex,
    currentEntry,
    currentCampaign,
    currentSession,
    currentArc,
    currentFront,
    currentStoryWeb,
    currentTab,
    currentContentType,
    currentContentId,
    currentContentTab,
    currentTag,
    currentEntryTopic,
    refreshCurrentEntry,
    setNewTab,
    refreshEntry,
    refreshCampaign,
    refreshSession,
    refreshArc,
    refreshFront,
    refreshStoryWeb,
    refreshCurrentContent,
    refreshTagResults,
  };
}
