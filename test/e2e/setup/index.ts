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

    // entries
    for (const topic in settingDescriptor.topics) {
      for (const descriptor of settingDescriptor.topics[topic]) {
        const entry = await api.createEntry(setting, topic, descriptor.name);
        if (!entry) {
          throw new Error('Failed to create entry in populateSetting()');
        }
        console.error(`Entry created ${descriptor.name}`);
      }
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



