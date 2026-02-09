// this store handles the main state (current setting, entry, etc.)
// Content-specific refs (currentEntry, currentCampaign, etc.) delegate to the focused panel's TabPanelState.

// library imports
import { computed, ref, shallowRef, watch, } from 'vue';

// local imports
import { useNavigationStore } from '@/applications/stores';
import { UserFlagKey, UserFlags, ModuleSettings, SettingKey, } from '@/settings';
import TitleUpdaterService from '@/utils/titleUpdater';
import NameGeneratorsService from '@/utils/nameGenerators';
import GlobalSettingService from '@/utils/globalSettings';
import AppWindowService from '@/utils/appWindow';

// types
import { Topics, WindowTabType, DocumentLinkType } from '@/types';
import { FCBSetting, WindowTab, Entry, Campaign, Session, Front, Arc, StoryWeb, CollapsibleNode, RootFolder } from '@/classes';
import { SessionNotesApplication } from '@/applications/SessionNotes';
import type { TabPanelState } from '@/composables/useTabPanelState';

// the store definition
export const mainStore = () => {

  ///////////////////////////////
  // the state

  ///////////////////////////////
  // internal state
  const _currentSetting = ref<FCBSetting | null>(null);  // the current setting

  // per-panel content state; delegates to whichever panel is currently focused
  // shallowRef prevents Vue from deeply converting TabPanelState to reactive,
  // which would auto-unwrap the computed refs inside it
  const _focusedPanelState = shallowRef<TabPanelState | null>(null);
 
  ///////////////////////////////
  // external state
  const rootFolder = ref<RootFolder | null>(null);

  /** whether the arc manager dialog is currently open */
  const isArcManagerOpen = ref<boolean>(false);

  /** prep/play mode toggle - true for play mode, false for prep mode */
  const isInPlayMode = ref<boolean>(ModuleSettings.get(SettingKey.isInPlayMode));

  const currentSettingCompendium = computed((): CompendiumCollection<any> => {
    if (!currentSetting.value)
      throw new Error('No currentSetting in mainStore.currentSettingCompendium()');

    const pack = currentSetting.value?.compendium || null;
    if (!pack)
      throw new Error('Bad compendia in mainStore.currentSettingCompendium()');

    return pack as CompendiumCollection<any>;
  });

  // content refs delegate to the focused panel's TabPanelState
  const currentEntry = computed((): Entry | null => (_focusedPanelState.value?.currentEntry?.value ?? null));
  const currentCampaign = computed((): Campaign | null => (_focusedPanelState.value?.currentCampaign?.value ?? null));
  const currentSession = computed((): Session | null => (_focusedPanelState.value?.currentSession?.value ?? null));
  const currentArc = computed((): Arc | null => (_focusedPanelState.value?.currentArc?.value ?? null));
  const currentFront = computed((): Front | null => (_focusedPanelState.value?.currentFront?.value ?? null));
  const currentStoryWeb = computed((): StoryWeb | null => (_focusedPanelState.value?.currentStoryWeb?.value ?? null));
  const currentContentType = computed((): WindowTabType => (_focusedPanelState.value?.currentContentType?.value ?? WindowTabType.NewTab));
  const currentTab = computed((): WindowTab | null => (_focusedPanelState.value?.currentTab?.value ?? null));
  const currentSetting = computed((): FCBSetting | null => (_currentSetting?.value as FCBSetting ?? null));
  const currentTag = computed((): { value: string | null } => (_focusedPanelState.value?.currentTag?.value ?? { value: null }));

  /** the current content id -- used primarily for main tabs to know when to refresh */
  const currentContentId = computed((): string | null => (_focusedPanelState.value?.currentContentId?.value ?? null));

  ///////////////////////////////
  // actions
  // set a new setting from a uuid
  const setNewSetting = async function (settingId: string | null): Promise<void> {
    if (!settingId) {
      _currentSetting.value = null;
      CollapsibleNode.currentSetting = null;
      await UserFlags.set(UserFlagKey.currentSetting, '');

      AppWindowService.closeCampaignBuilderApp();

      return;
    }

    // load the setting
    const setting = await GlobalSettingService.getGlobalSetting(settingId);
    
    if (!setting)
      throw new Error(`Invalid settingId in mainStore.setNewSetting(): ${settingId}`);

    // changing settings is problematic if we have unsaved changes in the popup because it clears the content before we can get it -- so check that
    if (SessionNotesApplication.app) {
      await SessionNotesApplication.app.close();
    }

    _currentSetting.value = setting;

    CollapsibleNode.currentSetting = setting;

    await UserFlags.set(UserFlagKey.currentSetting, settingId);
  };

  /** loads the content associated with the specified tab via the focused panel state */
  const setNewTab = async function (tab: WindowTab): Promise<void> {
    if (!currentSetting.value || !_focusedPanelState.value)
      return;

    await _focusedPanelState.value.setNewTab(tab);
  };

  /** Sets the focused panel state; called by navigationStore.focusPanel() */
  const setFocusedPanel = function (panelState: TabPanelState | null): void {
    _focusedPanelState.value = panelState;
  };

  /** Refreshes the current entry via the focused panel state */
  const refreshEntry = async function (): Promise<void> {
    await _focusedPanelState.value?.refreshEntry();
  };

  /** Refreshes the current campaign via the focused panel state */
  const refreshCampaign = async function (): Promise<void> {
    await _focusedPanelState.value?.refreshCampaign();
  };

  /** Refreshes the current front via the focused panel state */
  const refreshFront = async function (): Promise<void> {
    await _focusedPanelState.value?.refreshFront();
  };

  /** Refreshes the current story web via the focused panel state */
  const refreshStoryWeb = async function (): Promise<void> {
    await _focusedPanelState.value?.refreshStoryWeb();
  };

  /** Refreshes the current tag results via the focused panel state */
  const refreshTagResults = async function (): Promise<void> {
    await _focusedPanelState.value?.refreshTagResults();
  };

  const refreshSetting = async function (reload = false): Promise<void> {
    if (!_currentSetting.value?.raw?.parent)
      return;

    // just force all reactivity to update
    let newSetting;
    if (reload) {
      newSetting = await FCBSetting.fromUuid(_currentSetting.value.raw.parent.uuid);
    } else {
      newSetting = new FCBSetting(_currentSetting.value.raw.parent as unknown as JournalEntry);
    }

    await newSetting.populate();
    _currentSetting.value = newSetting;
  };

  /** Refreshes the current session via the focused panel state */
  const refreshSession = async function (reload = false): Promise<void> {
    await _focusedPanelState.value?.refreshSession(reload);
  };

  /** Refreshes the current arc via the focused panel state */
  const refreshArc = async function (reload = false): Promise<void> {
    await _focusedPanelState.value?.refreshArc(reload);
  };

  /** Refresh content across all panels, not just the focused one.
   *  This ensures panels showing the same content stay in sync. */
  const refreshCurrentContent = async function (): Promise<void> {
    // Setting refresh stays in mainStore since settings are global
    if (currentContentType.value === WindowTabType.Setting) {
      await refreshSetting();
      return;
    }

    // Refresh all panels so that duplicate views of the same content stay in sync
    await useNavigationStore().refreshContentAcrossPanels();
  }

  /**
   * Get all settings from the root folder
   * @returns Array of FCBSetting instances
   */
  const getAllSettings = async function (): Promise<FCBSetting[]> {
    const allSettings = ModuleSettings.get(SettingKey.settingIndex) || [];
    const settings: FCBSetting[] = [];

    for (const settingIndex of allSettings) {
      try {
        const setting = await GlobalSettingService.getGlobalSetting(settingIndex.settingId);
        if (setting) {
          settings.push(setting);
        }
      } catch (error) {
        console.error(`Error loading setting ${settingIndex.settingId}:`, error);
      }
    }

    return settings;
  }

  /**
   * Propagate setting name changes to related entities (roll tables, etc.)
   * This should be called after the setting name has been changed and saved
   * @param setting The setting whose name changed
   */
  const propagateSettingNameChange = async function (setting: FCBSetting): Promise<void> {
    // Update roll table names if roll tables are configured
    if (setting.rollTableConfig) {
      try {
        await NameGeneratorsService.updateSettingRollTableNames(setting);
      } catch (error) {
        console.error('Error updating roll table names:', error);
      }
    }
  }

  ///////////////////////////////
  // computed state
  const currentEntryTopic = computed((): Topics => _focusedPanelState.value?.currentEntryTopic?.value ?? Topics.None);

  const hasMultipleCampaigns = computed((): boolean => {
    if (!currentSetting.value) return false;

    return currentSetting.value.campaignIndex.length > 1;
  });

  // refreshCurrentEntry delegates to focused panel state
  const refreshCurrentEntry = computed({
    get: (): boolean => _focusedPanelState.value?.refreshCurrentEntry?.value ?? false,
    set: (val: boolean) => {
      if (_focusedPanelState.value)
        _focusedPanelState.value.refreshCurrentEntry.value = val;
    }
  });

  // the currently selected tab for the content page — delegates to focused panel
  const currentContentTab = computed({
    get: (): string | null => _focusedPanelState.value?.currentContentTab?.value ?? null,
    set: (newContentTab: string) => {
      if (_focusedPanelState.value)
        _focusedPanelState.value.currentContentTab.value = newContentTab;
    }
  });

  const currentDocumentType = computed((): DocumentLinkType => {
    if (!currentContentTab.value)
      return DocumentLinkType.None;

    switch (currentContentTab.value) {
      case 'scenes':
        return DocumentLinkType.Scenes;
      case 'actors':
        return DocumentLinkType.Actors;
      case 'foundry':
        return DocumentLinkType.GenericFoundry;
      default:
        return DocumentLinkType.None;
    }
  });

  ///////////////////////////////
  // internal functions

  ///////////////////////////////
  // watchers
  // Save isInPlayMode to settings whenever it changes
  watch(isInPlayMode, async (newValue) => {
    await ModuleSettings.set(SettingKey.isInPlayMode, newValue);   
  });

  /**
  * Updates the main window title to include the current setting name
  */
  watch(currentSetting, (newSetting, oldSetting) => {
    // make sure we're actually changing
    if (newSetting?.uuid === oldSetting?.uuid) {
      return;
    }

    TitleUpdaterService.updateWindowTitle(newSetting?.name || null);

    // if we're really changing settings, turn play mode off
    if (oldSetting) {
      isInPlayMode.value = false;
    }
  });

  ///////////////////////////////
  // lifecycle events

  ///////////////////////////////
  // return the public interface
  return {
    currentContentTab,
    currentDocumentType,
    currentSetting,
    currentEntryTopic,
    currentEntry,
    currentCampaign,
    currentSession,
    currentFront,
    currentArc,
    currentStoryWeb,
    currentTab,
    currentContentType,
    currentContentId,
    currentTag,
    isArcManagerOpen,
    rootFolder,
    currentSettingCompendium,
    refreshCurrentEntry,
    isInPlayMode,
    hasMultipleCampaigns,

    setNewSetting,
    setNewTab,
    setFocusedPanel,
    refreshEntry,
    refreshCampaign,
    refreshSession,
    refreshSetting,
    refreshArc,
    refreshFront,
    refreshStoryWeb,
    refreshCurrentContent,
    refreshTagResults,
    getAllSettings,
    propagateSettingNameChange,
  };
};