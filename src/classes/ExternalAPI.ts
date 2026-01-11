/**
 * ExternalAPI class that provides external access to the campaign builder module functionality
 */
import { useCampaignDirectoryStore, useMainStore, } from '@/applications/stores';
import { Topics, ValidTopic } from '@/types';
import { log } from '@/utils/log';
import { Campaign } from '@/classes/Documents/Campaign';
import { FCBDialog } from '@/dialogs';
import { FCBSetting } from '@/classes/Documents/FCBSetting';
import { Entry } from '@/classes/Documents/Entry';
import { Session } from './Documents';

interface GetListReturnValue { 
  uuid: string; 
  name: string
};

export class ExternalAPI {
  public TOPICS = {
    Character: Topics.Character,
    Location: Topics.Location,
    Organization: Topics.Organization,
    PC: Topics.PC,
  };

  /** only available in development mode */
  public testAPI: TestAPI | null = null;

  /**
   * Initialize the API
   */
  constructor() {
    if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
      this.testAPI = new TestAPI();
    }

    log(false, 'Campaign Builder External API initialized');
  }

  public getEntries(topic: ValidTopic): GetListReturnValue[] {
    const setting = useMainStore().currentSetting;

    if (!setting)
      return [];

    try {
      const topicFolder = setting.topicFolders[topic];

      const results = [] as GetListReturnValue[];

      for (const entry of topicFolder?.entryIndex || []) {
        results.push({ uuid: entry.uuid, name: entry.name });
      }

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
    for (const index of setting.campaignIndex) {
      retval.push({ uuid: index.uuid, name: index.name })
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
      const sessions = await campaign.allSessions();

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

class TestAPI {
  public loaded: boolean = false;

  constructor() {
    this.loaded = true;
  }

  /** should only be used for testing purposes - this will delete all of
   *  the data associated with this module (settings, campaigns, entries)
   */
  public async resetAll(): Promise<void> {
    // super dangerous - only load this code in development mode
    if (import.meta.env.MODE === 'development' || import.meta.env.MODE === 'test') {
      for (const setting of await useMainStore().getAllSettings()) {
        await setting.delete();
      }
    } else {
      throw new Error('resetAll() can only be called in development mode');
    }
  }


  /**
   * Creates a new setting
   * @param name The name of the setting
   * @param makeCurrent Whether to make this the current setting
   * @returns The new setting
   */
  public async createSetting(name: string, makeCurrent = true): Promise<FCBSetting | null> {
    return await FCBSetting.create(makeCurrent, name, '', true);
  }

  public async createCampaign(setting: FCBSetting, name: string): Promise<Campaign | null> {
    return await Campaign.create(setting, name);
  }

  public async createSession(campaign: Campaign, name: string): Promise<Session | null> {
    return await Session.create(campaign, name);
  }

  public async createEntry(setting: FCBSetting, topic: ValidTopic, name: string): Promise<Entry | null> {
    return await Entry.create(setting.topicFolders[topic]!, { name });
  }
}