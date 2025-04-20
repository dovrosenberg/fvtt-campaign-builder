/**
 * ExternalAPI class that provides external access to the campaign builder module functionality
 */
import { useCampaignDirectoryStore, useMainStore, useTopicDirectoryStore } from '@/applications/stores';
import { Topics, ValidTopic } from '@/types';
import { log } from '@/utils/log';
import { Campaign } from '@/classes/Campaign';
import { Entry } from './Entry';

type GetListReturnValue = { uuid: string; name: string};

export class ExternalAPI {
  public TOPICS = {
    Character: Topics.Character,
    Location: Topics.Location,
    Organization: Topics.Organization,
  };

  /**
   * Initialize the API
   */
  constructor() {
    log(false, 'Campaign Builder External API initialized');
  }

  public getEntries(topic: ValidTopic): GetListReturnValue[] {
    const world = useMainStore().currentWorld;

    if (!world)
      return [];

    try {
      const topicFolder = world.topicFolders[topic];

      const results = [] as GetListReturnValue[];

      topicFolder.allEntries().forEach((entry) => {
        results.push({ uuid: entry.uuid, name: entry.name });
      })

      return results;
    } catch (_e) {
      return [];
    }
  } 

  // creates an entry in the current world
  async createEntry(topic: ValidTopic): Promise<{uuid: string; name: string}| null> {
    const world = useMainStore().currentWorld;

    let entry: Entry | null = null;
    if (world) {
      entry = await useTopicDirectoryStore().createEntry(world.topicFolders[topic], {});
    }

    if (entry) {
      return { uuid: entry.uuid, name: entry.name };
    } else {
      return null;
    }
  }

  getCampaigns(): GetListReturnValue[] {
    const world = useMainStore().currentWorld;

    if (!world)
      return [];

    const retval = [] as GetListReturnValue[];
    for (const campaignId in world.campaignNames) {
      retval.push({ uuid: campaignId, name: world.campaignNames[campaignId]})
    }

    return retval;
  }

  async createCampaign(): Promise<{uuid: string; name: string}| null> {
    const world = useMainStore().currentWorld;

    let campaign: Campaign | null = null;
    if (world) {
      campaign = await Campaign.create(world);
    }

    if (campaign) {
      await useCampaignDirectoryStore().refreshCampaignDirectoryTree();
      return { uuid: campaign.uuid, name: campaign.name };
    } else {
      return null;
    }
  }

  async getSessions(): Promise<GetListReturnValue[]> {
    const world = useMainStore().currentWorld;

    if (!world)
      return [];

    const retval = [] as GetListReturnValue[];
    for (const campaignId in world.campaigns) {
      const campaign = world.campaigns[campaignId];
      const sessions = await campaign.getSessions();

      for (let i=0; i<sessions.length; i++) {
        retval.push({ uuid: sessions[i].uuid, name: sessions[i].name })
      }
    }

    return retval;
  }

  // for now, no create session because it requires a campaign be specified

  getWorld(): GetListReturnValue[] {
    const world = useMainStore().currentWorld;

    return world ? [{ uuid: world.uuid, name: world.name }] : [];
  }  
}