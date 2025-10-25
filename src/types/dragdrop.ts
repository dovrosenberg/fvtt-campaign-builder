import { ValidTopic } from '@/types';

export interface EntryNodeDragData {
  type: 'fcb-entry';
  childId: string;
  name: string;
  typeName: string;
  topic: ValidTopic;
};

export interface CampaignNodeDragData {
  type: 'fcb-campaign';
  campaignId: string;
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
  | SessionNodeDragData;

  