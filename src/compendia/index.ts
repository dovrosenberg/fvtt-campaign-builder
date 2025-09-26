// functions for managing folders and compendia
import { localize } from '@/utils/game';
import { Topics, } from '@/types';
import { ModuleSettings, SettingKey, UserFlagKey, UserFlags,} from '@/settings';
import { toTopic } from '@/utils/misc';
import { RootFolder, Setting } from '@/classes';


/**
 * Gets the root and setting folders.
 * Will create new folders if missing.
 * @returns The root and setting folders.
 */
export async function getDefaultFolders(): Promise<{ rootFolder: RootFolder; setting: Setting}> {
  const rootFolder = await RootFolder.get(); // will create if needed
  let settingId = UserFlags.get(UserFlagKey.currentSetting);  // this isn't setting-specific (obviously)

  // make sure we have a default and it exists
  let setting = null as Setting | null;
  if (settingId) {
    setting = await Setting.fromUuid(settingId);
  }   

  if (!setting) {
    // couldn't find it, default to first one (which is sort of random because it's not an array)
    const settings = ModuleSettings.get(SettingKey.settings) || {};
    if (Object.keys(settings).length>0) {
      settingId = Object.keys(settings)[0];
      setting = await Setting.fromUuid(settingId);
    } else {
      // no setting found, so create one
      setting = await Setting.create(true);
    }
  }

  // if we couldn't create one, then throw an error
  if (!setting)
    throw new Error('Couldn\'t create setting folder in compendia/index.getDefaultFolders()');

  return { rootFolder, setting };
}


/**
 * Returns a localized string representing the name of a given topic.
 * 
 * @param {Topics} topic - The topic for which to retrieve the text.
 * @returns {string} A localized string for the topic.
 * @throws {Error} If the topic is invalid.
 */
export function getTopicText(topic: Topics): string {
  switch (toTopic(topic)) {
    case Topics.Character: return localize('topics.character') || ''; 
    case Topics.Location: return localize('topics.location') || ''; 
    case Topics.Organization: return localize('topics.organization') || ''; 
    case Topics.PC: return localize('topics.pc') || ''; 
    case Topics.None:
    default: 
      throw new Error('Invalid topic in getTopicText()');
  }
}

/**
 * Returns a localized string representing the name of a given topic in plural form.
 * 
 * @param {Topics} topic - The topic for which to retrieve the text.
 * @returns {string} A localized string for the topic.
 * @throws {Error} If the topic is invalid.
 */
export function getTopicTextPlural(topic: Topics): string {
  switch (toTopic(topic)) {
    case Topics.Character: return localize('topics.characters') || ''; 
    case Topics.Location: return localize('topics.locations') || ''; 
    case Topics.Organization: return localize('topics.organizations') || ''; 
    case Topics.PC: return localize('topics.pcs') || ''; 
    case Topics.None:
    default: 
      throw new Error('Invalid topic in getTopicTextPlural()');
  }
}
