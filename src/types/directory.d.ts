import { DirectorySessionNode, DirectoryTopicNode } from '@/classes';

export interface DirectorySetting {
  id: string;   // the setting folder ID
  name: string;
  topicNodes: DirectoryTopicNode[];
}

export interface DirectoryCampaign {
  id: string;   // the campaign compendium uuid
  name: string;
  loadedSessions: DirectorySessionNode[];
  sessions: string[];  // ids of all the top items
  expanded: boolean;
}

export interface DirectorySessionNode {
  id: string;
  name: string;
  sessionNumber: number;   // needed to sort properly
  expanded: boolean;    // is the node expanded 
}
