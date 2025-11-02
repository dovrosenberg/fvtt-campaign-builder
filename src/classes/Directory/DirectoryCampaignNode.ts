/* 
 * A class representing an node representing a campaign in the campaign tree structures
 */

import { SessionBasicIndex, } from '@/types';
import { Campaign, CollapsibleNode, DirectoryArcNode, DirectoryFrontFolder, DirectorySessionNode, } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';

export class DirectoryCampaignNode<
  SessionNodes extends DirectorySessionNode | DirectoryArcNode,
  PossibleNodes extends SessionNodes | DirectoryFrontFolder = SessionNodes | DirectoryFrontFolder 
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

    // there are a few possibilities here:
    //   - if we are using fronts, the first child is the front folder
    //   - if we are using arcs, the children are the arcs; otherwise, they are the sessions
    if (ModuleSettings.get(SettingKey.useFronts)) {
      // add the front folder
      const newNode = await DirectoryFrontFolder.fromCampaign(this.id);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;
    }

    if (ModuleSettings.get(SettingKey.useArcs)) {
      // TODO: for now create a single one

      const newNode = await DirectoryArcNode.fromArc(this.id);
      CollapsibleNode._loadedNodes[newNode.id] = newNode;

    } else {
      // no arcs, so load all the sessions
    // we only want to load ones not already in _loadedNodes, unless its in updateIds
    const uuidsToLoad = ids.filter((id)=>!CollapsibleNode._loadedNodes[id] || updateIds.includes(id));

    const campaign = await Campaign.fromUuid(this.id);
    if (!campaign)
      throw new Error('Bad campaign id in DirectoryCampaignNode._loadNodeList()');

    const sessions = uuidsToLoad.length===0 ? [] : campaign.sessionIndex.filter((s: SessionBasicIndex)=> uuidsToLoad.includes(s.uuid));

    for (let i=0; i<sessions.length; i++) {
      const newNode = DirectorySessionNode.fromSessionBasicIndex(sessions[i], this.id);
        CollapsibleNode._loadedNodes[newNode.id] = newNode;
      }
    }
  }
}