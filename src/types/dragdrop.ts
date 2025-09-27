import { ValidTopic } from '@/types';

export type EntryNodeDragData = {
  type: 'fcb-entry';
  childId: string;
  name: string;
  typeName: string;
  topic: ValidTopic;
};

export type CampaignNodeDragData = {
  type: 'fcb-campaign';
  campaignId: string;
  name: string;
};

export type SessionNodeDragData = {
  type: 'fcb-session';
  sessionId: string;
  name: string;
};

export type BookmarkDragDropData = {
  type: 'fcb-bookmark';
  bookmarkId: string;
}

export type TabDragData = {
  type: 'fcb-tab';
  tabId: string;
}

export type NodeDragDropData = 
  | EntryNodeDragData 
  | CampaignNodeDragData 
  | SessionNodeDragData;

  