export { id as MODULE_ID } from '@module';
import { Topic } from '@/types';

// sometimes topic ends up as a string (ex. when pulling from DOM), so this makes sure
//    it can always be compared properly (particuarly for use in switch or [].includes, etc.)
export function toTopic(topic: string | number | Topic | null | undefined): Topic | null {
  const castedTopic = typeof topic === 'string' ? parseInt(topic) as Topic : topic;

  return castedTopic ?? null;
}

export function getIcon(topic: string | number | Topic | null | undefined) {
  switch (toTopic(topic)) {
    case Topic.Character: 
      return 'fa-user';
    case Topic.Location: 
      return 'fa-place-of-worship';
    case Topic.Organization: 
      return 'fa-flag';
    case Topic.Event: 
      return 'fa-calendar-days';
    default: 
      return '';
  }
}
