// functions for managing folders and compendia
import { localize } from '@/utils/game';
import { Topics, } from '@/types';
import { ModuleSettings, SettingKey, UserFlagKey, UserFlags,} from '@/settings';
import { toTopic } from '@/utils/misc';
import { FCBSetting, } from '@/classes';
import { getGlobalSetting } from '@/utils/globalSettings';

/**
 * Gets the current setting (will create one if there isn't one) 
 * @returns The FCBSetting 
 */
export async function getCurrentSetting(): Promise<FCBSetting | null> {
  let settingId = UserFlags.get(UserFlagKey.currentSetting);  // this isn't setting-specific (obviously)

  
  // make sure we have a default and it exists
  let setting = null as FCBSetting | null;
  if (settingId) {
    setting = await getGlobalSetting(settingId);
  }   

  if (!setting) {
    // couldn't find it, default to first one (which is sort of random because it's not an array)
    const settings = ModuleSettings.get(SettingKey.settingIndex) || [];
    if (settings.length>0) {
      // in case any are bad - loop through them all
      do {
        settingId = settings[0].settingId;
        setting = await getGlobalSetting(settingId);
      } while (!setting && settings.length>0);
    }

    // still don't have one (because whatever ws in the index was bad)
    if (!setting) {
      // no setting found, so create one
      setting = await FCBSetting.create(true);
    }

    if (setting?.uuid)
      await UserFlags.set(UserFlagKey.currentSetting, setting.uuid);  // this isn't setting-specific (obviously)
  }

  return setting || null;
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
