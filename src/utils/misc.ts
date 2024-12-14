import { Topic, WindowTabType } from '@/types';

// sometimes topic ends up as a string (ex. when pulling from DOM), so this makes sure
//    it can always be compared properly (particuarly for use in switch or [].includes, etc.)
export function toTopic(topic: string | number | Topic | null | undefined): Topic | null {
  const castedTopic = typeof topic === 'string' ? parseInt(topic) as Topic : topic;

  return castedTopic ?? null;
}

export function toWindowTabType(type: string | number | WindowTabType | null | undefined): WindowTabType | null {
  const castedType = typeof type === 'string' ? parseInt(type) as WindowTabType : type;

  return castedType ?? null;
}

export function getTopicIcon(topic: string | number | Topic | null | undefined) {
  switch (toTopic(topic)) {
    case Topic.Character: 
      return 'fa-user';
    case Topic.Location: 
      return 'fa-location-dot';   //'fa-place-of-worship';
    case Topic.Organization: 
      return 'fa-flag';
    case Topic.Event: 
      return 'fa-calendar-days';
    default: 
      return '';
  }
}

export function getTabTypeIcon(type: string | number | WindowTabType | null | undefined) {
  switch (toWindowTabType(type)) {
    case WindowTabType.Campaign: 
      return 'fa-signs-post';
    case WindowTabType.Session: 
      return 'fa-tent';
    case WindowTabType.Entry:
      throw new Error('Tried to use getTabTypeIcon() for Entry');
    default: 
      return '';
  }
}
