/**
 * ExternalAPI class that provides external access to the campaign builder module functionality
 */
import { useMainStore } from '@/applications/stores';
import { Topics, ValidTopic } from '@/types';

type GetListReturnValue = { uuid: string; name: string};

export class ExternalAPI {
  /**
   * Initialize the API
   */
  constructor() {
    console.log('Campaign Builder External API initialized');
  }

  private _getTopicList(topic: ValidTopic): GetListReturnValue[] {
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

  /**
   * Get all characters in the world (uuid and name)
   */
  getCharacters(): GetListReturnValue[] {
    return this._getTopicList(Topics.Character);
  }

  /**
   * Get all characters in the world (uuid and name)
   */
  getLocations(): GetListReturnValue[] {
    return this._getTopicList(Topics.Location);
  }

  /**
   * Get all characters in the world (uuid and name)
   */
  getOrganizations(): GetListReturnValue[] {
    return this._getTopicList(Topics.Organization);
  }


    /**
   * Get all campaigns in the world (uuid and name)
   */
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

 
  /**
   * Get all sessions in the world (uuid and name)
   */
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

    /**
   * Get the current world (uuid and name)
   */
    getWorld(): GetListReturnValue[] {
      const world = useMainStore().currentWorld;
  
      return world ? [{ uuid: world.uuid, name: world.name }] : [];
    }  
}