// this store handles the main state (current setting, entry, etc.)

// library imports
import { defineStore, } from 'pinia';
import { computed, ref, watch } from 'vue';

// local imports
import { UserFlagKey, UserFlags, ModuleSettings, SettingKey, moduleId, } from '@/settings';
import { updateWindowTitle } from '@/utils/titleUpdater';
import { useNavigationStore } from '@/applications/stores/navigationStore';
import { updateSettingRollTableNames } from '@/utils/nameGenerators';

// types
import { Topics, WindowTabType, DocumentLinkType } from '@/types';
import { FCBSetting, WindowTab, Entry, Campaign, Session, Front, Arc, CollapsibleNode, RootFolder, getGlobalSetting } from '@/classes';
import { SessionNotesApplication } from '@/applications/SessionNotes';

// the store definition
export const useMainStore = defineStore('main', () => {

  ///////////////////////////////
  // the state

  ///////////////////////////////
  // internal state
  const _currentEntry = ref<Entry | null>(null);  // current entry (when showing an entry tab)
  const _currentCampaign = ref<Campaign | null>(null);  // current campaign (when showing a campaign tab)
  const _currentFront = ref<Front | null>(null);  // current front (when showing a front tab)
  const _currentArc = ref<Arc | null>(null);  // current arc (when showing a front tab)
  const _currentSession = ref<Session  | null>(null);  // current session (when showing a session tab)
  const _currentTab = ref<WindowTab | null>(null);  // current tab
  const _currentSetting = ref<FCBSetting | null>(null);  // the current setting

  ///////////////////////////////
  // external state
  const rootFolder = ref<RootFolder | null>(null);

  /** can set this to tell current entry tab to refresh everything */
  const refreshCurrentEntry = ref<boolean>(false);

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

  // these are the currently selected entry shown in the main tab
  // it's a little confusing because the ones called 'entry' mean our entries -- they're actually JournalEntryPage
  const currentEntry = computed((): Entry | null => (_currentEntry?.value || null) as Entry | null);
  const currentCampaign = computed((): Campaign | null => (_currentCampaign?.value || null) as Campaign | null);
  const currentSession = computed((): Session | null => (_currentSession?.value || null) as Session | null);
  const currentArc = computed((): Arc | null => (_currentArc?.value || null) as Arc | null);
  const currentFront = computed((): Front | null => (_currentFront?.value || null) as Front | null);
  const currentContentType = computed((): WindowTabType => _currentTab?.value?.tabType || WindowTabType.NewTab);  
  const currentTab = computed((): WindowTab | null => _currentTab?.value);  
  const currentSetting = computed((): FCBSetting | null => (_currentSetting?.value || null) as FCBSetting | null);
  
  /** the current content id -- used primarily for main tabs to know when to refresh */
  const currentContentId = computed((): string | null => {
    return _currentEntry.value ? _currentEntry.value.uuid : 
      _currentCampaign.value ? _currentCampaign.value.uuid : 
      _currentSession.value ? _currentSession.value.uuid : 
      _currentArc.value ? _currentArc.value.uuid : 
      _currentFront.value ? _currentFront.value.uuid : 
      null;
  });

  ///////////////////////////////
  // actions
  // set a new setting from a uuid
  const setNewSetting = async function (settingId: string | null): Promise<void> {
    if (!settingId) {
      _currentSetting.value = null;
      CollapsibleNode.currentSetting = null;
      await UserFlags.set(UserFlagKey.currentSetting, '');

      // @ts-ignore
      game.modules.get(moduleId)?.activeWindow?.close();
      return;
    }

    // load the setting
    const setting = await getGlobalSetting(settingId);
    
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

  const setNewTab = async function (tab: WindowTab): Promise<void> {
    if (!currentSetting.value)
      return;

    _currentTab.value = tab;

    // clear everything
    _currentEntry.value = null;
    _currentCampaign.value = null;
    _currentSession.value = null;
    _currentFront.value = null;

    switch (tab.tabType) {
      case WindowTabType.Entry:
        if (tab.header.uuid) {
          _currentEntry.value = await Entry.fromUuid(tab.header.uuid);
          if (!_currentEntry.value)
            throw new Error(`Invalid entry uuid ${tab.header.uuid} in mainStore.setNewTab()`);

          // _currentEntry.value.topicFolder = currentSetting.value.topicFolders[_currentEntry.value.topic];
        }
        break;
      case WindowTabType.Setting:
        // we can only set tabs within a setting, so we don't actually need to do anything here
        break;
      case WindowTabType.Campaign:
        if (tab.header.uuid) {
          _currentCampaign.value = await Campaign.fromUuid(tab.header.uuid);

          if (!_currentCampaign.value)
            throw new Error(`Invalid campaign uuid ${tab.header.uuid} in mainStore.setNewTab()`);
        }
        break;
      case WindowTabType.Front:
        if (tab.header.uuid) {
          _currentFront.value = await Front.fromUuid(tab.header.uuid);
          if (!_currentFront.value)
            throw new Error(`Invalid front uuid ${tab.header.uuid} in mainStore.setNewTab()`);
        }
        break;
      case WindowTabType.Session:
        if (tab.header.uuid) {
          _currentSession.value = await Session.fromUuid(tab.header.uuid);
          if (!_currentSession.value)
            throw new Error(`Invalid session uuid ${tab.header.uuid} in mainStore.setNewTab()`);
        }
        break;
      default:  // make it a 'new entry' window
        tab.tabType = WindowTabType.NewTab;
    }
  };

  /**
   * Refreshes the current entry by forcing all reactive properties to update.
   * This is achieved by simply creating a new entry based on the EntryDoc of the current one
   */
  const refreshEntry = async function (): Promise<void> {
    if (!_currentEntry.value?.raw?.parent || !currentSetting.value)
      return;

    // just force all reactivity to update
    _currentEntry.value = new Entry(_currentEntry.value.raw.parent as unknown as JournalEntry);
  };

  const refreshCampaign = async function (): Promise<void> {
    if (!_currentCampaign.value?.raw?.parent || !currentSetting.value)
      return;

    // just force all reactivity to update
    _currentCampaign.value = new Campaign(_currentCampaign.value.raw.parent as unknown as JournalEntry);
  };

  const refreshFront = async function (): Promise<void> {
    if (!_currentFront.value?.raw?.parent || !currentSetting.value)
      return;

    // just force all reactivity to update
    _currentFront.value = new Front(_currentFront.value.raw.parent as unknown as JournalEntry);
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

  const refreshSession = async function (reload = false): Promise<void> {
    if (!_currentSession.value?.raw?.parent || !currentSetting.value)
      return;

    // just force all reactivity to update
    const campaign = await _currentSession.value.loadCampaign();
    if (reload)
      _currentSession.value = await Session.fromUuid(_currentSession.value.raw.parent.uuid);
    else
      _currentSession.value = new Session(_currentSession.value.raw.parent as unknown as JournalEntry, campaign || undefined);
  };

  /** Refresh whatever content is currently showing */
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
      case WindowTabType.Front:
        await refreshFront();
        break;
      case WindowTabType.Setting:
        await refreshSetting();
        break;
      default:
    }
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
        const setting = await getGlobalSetting(settingIndex.settingId);
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
        await updateSettingRollTableNames(setting);
      } catch (error) {
        console.error('Error updating roll table names:', error);
      }
    }
  }

  ///////////////////////////////
  // computed state
  const currentEntryTopic = computed((): Topics => {
    if (!currentEntry.value)
      return Topics.None;

    return currentEntry.value.topic || Topics.None;
  });

  const hasMultipleCampaigns = computed((): boolean => {
    if (!currentSetting.value) return false;
    return Object.values(currentSetting.value.campaignNames).length > 1;
  });

  // the currently selected tab for the content page
  const currentContentTab = computed({
    get: (): string | null => _currentTab.value?.contentTab || null,
    set: (newContentTab: string) => {
        if (_currentTab.value) {
          // Update the contentTab property of the current tab
          _currentTab.value.contentTab = newContentTab;
          
          // update the tab history in the DB
          void useNavigationStore().updateContentTab(newContentTab);
        }
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

    updateWindowTitle(newSetting?.name ?? null);

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
    currentTab,
    currentContentType,
    currentContentId,
    rootFolder,
    currentSettingCompendium,
    refreshCurrentEntry,
    isInPlayMode,
    hasMultipleCampaigns,

    setNewSetting,
    setNewTab,
    refreshEntry,
    refreshCampaign,
    refreshSession,
    refreshSetting,
    refreshFront,
    refreshCurrentContent,
    getAllSettings,
    propagateSettingNameChange,
  };
});