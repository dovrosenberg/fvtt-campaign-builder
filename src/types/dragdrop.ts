import { ValidTopic } from '@/types';

export interface EntryNodeDragData {
  type: 'fcb-entry';
  childId: string;
  name: string;
  typeName: string;
  topic: ValidTopic;
};

export interface StoryWebNodeDragData {
  type: 'fcb-storyWeb';
  storyWebId: string;
  name: string;
};

export interface SettingNodeDragData {
  type: 'fcb-setting';
  settingId: string;
  name: string;
};

export interface FrontNodeDragData {
  type: 'fcb-front';
  frontId: string;
  name: string;
};

export interface CampaignNodeDragData {
  type: 'fcb-campaign';
  campaignId: string;
  name: string;
};

export interface ArcNodeDragData {
  type: 'fcb-arc';
  arcId: string;
  name: string;
};

export interface SessionNodeDragData {
  type: 'fcb-session';
  sessionId: string;
  name: string;
};

export interface BookmarkDragDropData {
  type: 'fcb-bookmark';
  bookmarkId: string;
}

export interface TabDragData {
  type: 'fcb-tab';
  tabId: string;
}

export type NodeDragDropData = 
  | EntryNodeDragData 
  | CampaignNodeDragData 
  | ArcNodeDragData
  | SessionNodeDragData 
  | SettingNodeDragData
  | FrontNodeDragData
  | StoryWebNodeDragData
  ;

export type FoundryDragType = {
  type: string;
  uuid: string;
}

export type KnownDragTypes = 
  FoundryDragType | 
  { type: 'JournalEntry'; fcbData: NodeDragDropData } |
  BookmarkDragDropData |
  TabDragData;

