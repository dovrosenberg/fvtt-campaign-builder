export { id as MODULE_ID } from '@module';
import { Topic } from '@/types';

export function getIcon(type: string | number | Topic | null | undefined) {
  if (!type)
    return '';

  const castedType = typeof type === 'string' ? parseInt(type) as Topic : type;

  switch (castedType) {
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
