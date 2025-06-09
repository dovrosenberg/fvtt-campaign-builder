import { DirectorySessionNode, DirectoryTopicNode } from '@/classes';

export type DirectorySetting = {
  id: string;   // the setting folder ID
  name: string;
  topicNodes: DirectoryTopicNode[];
}

export type DirectoryCampaign = {
  id: string;   // the campaign compendium uuid
  name: string;
  loadedSessions: DirectorySessionNode[];
  sessions: string[];  // ids of all the top items
  expanded: boolean;
}

export type DirectorySessionNode = {
  id: string;
  name: string;
  sessionNumber: number;   // needed to sort properly
  expanded: boolean;    // is the node expanded 
}
