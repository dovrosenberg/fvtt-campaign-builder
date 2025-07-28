/**
 * ExternalAPI class that provides external access to the campaign builder module functionality
 */
import { useCampaignDirectoryStore, useMainStore, } from '@/applications/stores';
import { Topics, ValidTopic } from '@/types';
import { log } from '@/utils/log';
import { Campaign } from '@/classes/Campaign';
import { FCBDialog } from '@/dialogs';

type GetListReturnValue = { uuid: string; name: string};

export class ExternalAPI {
  public TOPICS = {
    Character: Topics.Character,
    Location: Topics.Location,
    Organization: Topics.Organization,
    PC: Topics.PC,
  };

  /**
   * Initialize the API
   */
  constructor() {
    log(false, 'Campaign Builder External API initialized');
  }

  public getEntries(topic: ValidTopic): GetListReturnValue[] {
    const setting = useMainStore().currentSetting;

    if (!setting)
      return [];

    try {
      const topicFolder = setting.topicFolders[topic];

      const results = [] as GetListReturnValue[];

      topicFolder.allEntries().forEach((entry) => {
        results.push({ uuid: entry.uuid, name: entry.name });
      })

      return results;
    } catch (_e) {
      return [];
    }
  } 

  // creates an entry in the current setting
  async createEntry(topic: ValidTopic): Promise<{uuid: string; name: string}| null> {
    const entry = await FCBDialog.createEntryDialog(topic, { } );

    if (entry) {
      return { uuid: entry.uuid, name: entry.name };
    } else {
      return null;
    }
  }

  getCampaigns(): GetListReturnValue[] {
    const setting = useMainStore().currentSetting;

    if (!setting)
      return [];

    const retval = [] as GetListReturnValue[];
    for (const campaignId in setting.campaignNames) {
      retval.push({ uuid: campaignId, name: setting.campaignNames[campaignId]})
    }

    return retval;
  }

  async createCampaign(): Promise<{uuid: string; name: string}| null> {
    const setting = useMainStore().currentSetting;

    let campaign: Campaign | null = null;
    if (setting) {
      campaign = await Campaign.create(setting);
    }

    if (campaign) {
      await useCampaignDirectoryStore().refreshCampaignDirectoryTree();
      return { uuid: campaign.uuid, name: campaign.name };
    } else {
      return null;
    }
  }

  // leaving async for now for backwards compatibility, even though not actually needed any more
  async getSessions(): Promise<GetListReturnValue[]> {
    const setting = useMainStore().currentSetting;

    if (!setting)
      return [];

    const retval = [] as GetListReturnValue[];
    for (const campaignId in setting.campaigns) {
      const campaign = setting.campaigns[campaignId];
      const sessions = campaign.sessions;

      for (let i=0; i<sessions.length; i++) {
        retval.push({ uuid: sessions[i].uuid, name: sessions[i].name })
      }
    }

    return retval;
  }

  // for now, no create session because it requires a campaign be specified

  getSetting(): GetListReturnValue[] {
    const setting = useMainStore().currentSetting;

    return setting ? [{ uuid: setting.uuid, name: setting.name }] : [];
  }  
}