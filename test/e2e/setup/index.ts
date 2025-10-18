// starts from an assumed empty world and creates the base settings
import { SettingDescriptor } from '@e2etest/data/setting';
import { sharedContext } from '@e2etest/sharedContext';
import { Topics } from '@/types';

const topicValues = {
  Character: Topics.Character,
  Location: Topics.Location,
  Organization: Topics.Organization,
  PC: Topics.PC,
}

export const populateSetting = async (settingDescriptor: SettingDescriptor) => {
  const page = sharedContext.page!;

  // we're going to do this all manually
  await page.evaluate(async ({settingDescriptor, tv}: {settingDescriptor: SettingDescriptor, tv: typeof topicValues}) => {
    const api = game.modules.get('campaign-builder')?.api.testAPI;

    const setting = await api.createSetting(settingDescriptor.name, false);
    console.error(`Setting created ${settingDescriptor.name}`);
    
    if (!setting) {
      throw new Error('Failed to create setting in populateSetting()');
    }
    
    setting.genre = settingDescriptor.genre;
    setting.settingFeeling = settingDescriptor.settingFeeling;
    setting.description = settingDescriptor.description;

    // characters
    for (const characterDescriptor of settingDescriptor.characters) {
      const character = await api.createEntry(setting, tv.Character, characterDescriptor.name);
      if (!character) {
        throw new Error('Failed to create character in populateSetting()');
      }
      console.error(`Character created ${characterDescriptor.name}`);
    }

    for (const locationDescriptor of settingDescriptor.locations) {
      const location = await api.createEntry(setting, tv.Location, locationDescriptor.name);
      if (!location) {
        throw new Error('Failed to create location in populateSetting()');
      }
      console.error(`Location created ${locationDescriptor.name}`);
    }

    for (const organizationDescriptor of settingDescriptor.organizations) {
      const organization = await api.createEntry(setting, tv.Organization, organizationDescriptor.name);
      if (!organization) {
        throw new Error('Failed to create organization in populateSetting()');
      }
      console.error(`Organization created ${organizationDescriptor.name}`);
    }

    for (const pcDescriptor of settingDescriptor.pcs) {
      const pc = await api.createEntry(setting, tv.PC, pcDescriptor.name);
      if (!pc) {
        throw new Error('Failed to create pc in populateSetting()');
      }
      console.error(`PC created ${pcDescriptor.name}`);
    }

    for (const campaignDescriptor of settingDescriptor.campaigns) {
      const campaign = await api.createCampaign(setting, campaignDescriptor.name);
      if (!campaign) {
        throw new Error('Failed to create campaign in populateSetting()');
      }

      for (const sessionDescriptor of campaignDescriptor.sessions) {
        const session = await api.createSession(campaign, sessionDescriptor.name);
        if (!session) {
          throw new Error('Failed to create session in populateSetting()');
        }
        console.error(`Session created ${sessionDescriptor.name}`);
      }
      console.error(`Campaign created ${campaignDescriptor.name}`);
    }

    console.error(`Setting populated ${settingDescriptor.name}`);

    await setting.save();
    console.error(`Setting created ${settingDescriptor.name}`);
  }, { settingDescriptor, tv: topicValues});
}



