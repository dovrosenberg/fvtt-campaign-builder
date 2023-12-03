export { id as MODULE_ID } from '@module';
import { TopicTypes } from '@/types';

export function getIcon(type: TopicTypes) {
  switch (type) {
      case TopicTypes.Character: 
        return 'fa-user';
      case TopicTypes.Location: 
        return 'fa-place-of-worship';
      case TopicTypes.Organization: 
        return 'fa-flag';
      case TopicTypes.Event: 
        return 'fa-calendar-days';
      default: return '';
  }
}
