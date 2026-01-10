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

  updateGlobalSetting: (setting: FCBSetting) => {
    globalSettings[setting.uuid] = setting;
  },

  removeGlobalSetting: (settingId: string) => {
    delete globalSettings[settingId];
  }
};

export default GlobalSettingService;