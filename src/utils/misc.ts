import { Topics, WindowTabType } from '@/types';

// sometimes topic ends up as a string (ex. when pulling from DOM), so this makes sure
//    it can always be compared properly (particuarly for use in switch or [].includes, etc.)
export function toTopic(topic: string | number | Topics | null | undefined): Topics | null {
  const castedTopic = typeof topic === 'string' ? parseInt(topic) as Topics : topic;

  return castedTopic ?? null;
}

export function toWindowTabType(type: string | number | WindowTabType | null | undefined): WindowTabType | null {
  const castedType = typeof type === 'string' ? parseInt(type) as WindowTabType : type;

  return castedType ?? null;
}

export function getTopicIcon(topic: string | number | Topics | null | undefined) {
  switch (toTopic(topic)) {
    case Topics.Character: 
      return 'fa-user';
    case Topics.Location: 
      return 'fa-location-dot';   //'fa-place-of-worship';
    case Topics.Organization: 
      return 'fa-flag';
    case Topics.Event: 
      return 'fa-calendar-days';
    default: 
      return '';
  }
}

export function getTabTypeIcon(type: string | number | WindowTabType | null | undefined) {
  switch (toWindowTabType(type)) {
    case WindowTabType.World: 
      return 'fa-globe';
    case WindowTabType.Campaign: 
      return 'fa-signs-post';
    case WindowTabType.Session: 
      return 'fa-tent';
    case WindowTabType.PC: 
      return 'fa-user-ninja';
    case WindowTabType.Entry:
      throw new Error('Tried to use getTabTypeIcon() for Entry');
    default: 
      return '';
  }
}
