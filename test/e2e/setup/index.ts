// starts from an assumed empty world and creates the base settings
import { SettingDescriptor } from '@e2etest/data/setting';
import { testData } from '../data';
import { sharedContext } from '@e2etest/sharedContext';
import { Topics } from '@/types';

const topicValues = {
  Character: Topics.Character,
  Location: Topics.Location,
  Organization: Topics.Organization,
  PC: Topics.PC,
}

export const populateWorld = async () => {
  const page = sharedContext.page!;

  // we're going to do this all manually
  for (const settingDescriptor of testData.settings) {
    await page.evaluate(async ({settingDescriptor, topicValues}: {settingDescriptor: SettingDescriptor, topicValues: typeof topicValues}) => {
      const api = game.modules.get('campaign-builder')?.api.testAPI;

      const setting = await api.createSetting(settingDescriptor.name, false);
      if (!setting) {
        throw new Error('Failed to create setting in populateWorld()');
      }
      
      setting.genre = settingDescriptor.genre;
      setting.settingFeeling = settingDescriptor.settingFeeling;
      setting.description = settingDescriptor.description;

      // characters
      for (const characterDescriptor of settingDescriptor.characters) {
        const character = await api.createEntry(setting, topicValues.Character, characterDescriptor.name);
        if (!character) {
          throw new Error('Failed to create character in populateWorld()');
        }
      }

      for (const locationDescriptor of settingDescriptor.locations) {
        const location = await api.createEntry(setting, topicValues.Location, locationDescriptor.name);
        if (!location) {
          throw new Error('Failed to create location in populateWorld()');
        }
      }

      for (const organizationDescriptor of settingDescriptor.organizations) {
        const organization = await api.createEntry(setting, topicValues.Organization, organizationDescriptor.name);
        if (!organization) {
          throw new Error('Failed to create organization in populateWorld()');
        }
      }

      for (const pcDescriptor of settingDescriptor.pcs) {
        const pc = await api.createEntry(setting, topicValues.PC, pcDescriptor.name);
        if (!pc) {
          throw new Error('Failed to create pc in populateWorld()');
        }
      }

      for (const campaignDescriptor of settingDescriptor.campaigns) {
        const campaign = await api.createCampaign(setting, campaignDescriptor.name);
        if (!campaign) {
          throw new Error('Failed to create campaign in populateWorld()');
        }

        for (const sessionDescriptor of campaignDescriptor.sessions) {
          const session = await api.createSession(campaign, sessionDescriptor.name);
          if (!session) {
            throw new Error('Failed to create session in populateWorld()');
          }
        }
      }

      console.log(`Setting populated ${settingDescriptor.name}`);

      await setting.save();
      console.log(`Setting created ${settingDescriptor.name}`);
      }, { settingDescriptor, topicValues});
  }
}



