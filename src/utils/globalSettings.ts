// the global settings - the vast majority of users likely have a single setting
// by keeping a global instance we can avoid the overhead in memory and time of having
//    to continually load the setting over the network; since we'll always have one
//    one setting in use anyway, this incurs no additional overhead when the world only
//    contains one
// even for worlds with multiple settings, the old way (loading setting as needed) 
//    typically resulted in multiple (many) copies in memory at once

import { FCBSetting } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';

let globalSettings: Record<string, FCBSetting> = {};

const GlobalSettingService = {
  getGlobalSetting: async (settingId: string): Promise<FCBSetting | null> => {
    // see if we already have it
    let setting: FCBSetting | undefined | null = globalSettings[settingId];

    if (setting)
      return setting;

    // otherwise load it
    try {
      setting = await FCBSetting.fromUuid(settingId);
    } catch (e) {
      // do nothing
    };

    if (!setting) {
      // the most likely cause here is that someone deleted the compendium; remove it from the index
      // so we can just try again
      let indexes = ModuleSettings.get(SettingKey.settingIndex);
      indexes = indexes.filter(index => index.settingId !== settingId);
      await ModuleSettings.set(SettingKey.settingIndex, indexes);

      return null;
    };
    
    if (setting)
      globalSettings[settingId] = setting;
    else 
      delete globalSettings[settingId];
    
    return setting;
  },

  /**
   * Synchronously returns the cached setting instance, if any.
   * Used by consumers that need the live shared instance without an asynchronous call 
   * and that know it already exists (e.g. the directory tree resolving the current setting on every expand/collapse).
   * @param settingId - uuid of the setting's JournalEntry
   * @returns the cached setting or null if not cached
   */
  getCachedSetting: (settingId: string): FCBSetting | null => {
    return globalSettings[settingId] || null;
  },

  updateGlobalSetting: (setting: FCBSetting) => {
    globalSettings[setting.uuid] = setting;
  },

  /**
   * Evicts a cached setting and reloads it from the database in one step, so callers
   * cannot forget the eviction and end up with two live instances of the same setting.
   * @param settingId - uuid of the setting's JournalEntry
   * @returns the freshly loaded setting, or null if it no longer exists
   */
  reloadGlobalSetting: async (settingId: string): Promise<FCBSetting | null> => {
    delete globalSettings[settingId];
    return GlobalSettingService.getGlobalSetting(settingId);
  },

  removeGlobalSetting: (settingId: string) => {
    delete globalSettings[settingId];
  },

  /**
   * Clear all cached settings. Used during import to reset the cache.
   */
  clearAll: () => {
    globalSettings = {};
  }
};

export default GlobalSettingService;