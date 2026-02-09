/* 
 * A class representing an node representing a campaign in the campaign tree structures
 */

import { ArcBasicIndex, } from '@/types';
import { Campaign, CollapsibleNode, DirectoryArcNode, DirectoryFrontFolder, DirectorySessionNode, DirectoryStoryWebFolder, } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';

export class DirectoryCampaignNode<
  SessionNodes extends DirectorySessionNode | DirectoryArcNode,
  PossibleNodes extends SessionNodes | DirectoryFrontFolder | DirectoryStoryWebFolder = SessionNodes | DirectoryFrontFolder | DirectoryStoryWebFolder 
> extends CollapsibleNode<PossibleNodes> {
  name: string;
  completed: boolean;
  
  constructor(id: string, name: string, children: string[] = [], 
    loadedChildren: (PossibleNodes)[] = [], expanded: boolean = false, 
    completed: boolean = false
  ) {

    super(id, expanded, null, children, loadedChildren, []);

    this.name = name;
    this.completed = completed;
  }

  /**
   * loads a set of nodes, including expanded status
   * @override
   * @param ids uuids of the nodes to load
   * @param updateIds uuids of the nodes that should be refreshed
   */
  override async _loadNodeList(ids: string[], updateIds: string[] ): Promise<void> {
    // make sure we've loaded what we need
    if (!CollapsibleNode._currentSetting) {
      CollapsibleNode._loadedNodes = {};
      return;
    }

    // if we are using fronts, the first child is the front folder
    if (ModuleSettings.get(SettingKey.useFronts)) {
      // add the front folder
      const newNode = await DirectoryFrontFolder.fromCampaign(this.id);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }

    // ditto for story web folder
    if (ModuleSettings.get(SettingKey.useStoryWebs)) {
      const storyWebNode = await DirectoryStoryWebFolder.fromCampaign(this.id);
      CollapsibleNode._loadedNodes[storyWebNode.id] = storyWebNode;
    }

    // the rest of the children are arcs
    // const campaign = await Campaign.fromUuid(this.id);
    //     // Get fresh campaign data from setting's campaigns cache (which was just refreshed)
    const campaign = CollapsibleNode._currentSetting.campaigns[this.id] || await Campaign.fromUuid(this.id);

    if (!campaign)
      throw new Error('Bad campaign id in DirectoryCampaignNode._loadNodeList()');

    // we only want to load ones not already in _loadedNodes, unless its in updateIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    const arcs = uuidsToLoad.length===0 ? [] : 
      CollapsibleNode._currentSetting.campaignIndex.find((c)=>c.uuid===this.id)
        ?.arcs.filter((a: ArcBasicIndex)=> uuidsToLoad.includes(a.uuid)) || [];

    for (let i=0; i<arcs.length; i++) {
      const newNode = DirectoryArcNode.fromArcBasicIndex(arcs[i], campaign);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }
  }
}