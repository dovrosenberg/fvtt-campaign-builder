import { EntryBasicIndex, StoryWebNodeTypes, Topics, WindowTabType } from '@/types';

/**
 * Safely converts a topic value to the Topics enum type.  Sometimes topic ends up a string
 * (ex. when pulling from DOM), so this makes sure it can be compared properly for use in switch
 * or [].includes, etc.
 * Handles string representations by parsing them to integers, and provides null safety.
 * 
 * @param topic - The topic value to convert (string, number, Topics enum, or null/undefined)
 * @returns The corresponding Topics enum value, or null if conversion fails
 */
export function toTopic(topic: string | number | Topics | null | undefined): Topics | null {
  const castedTopic = typeof topic === 'string' ? parseInt(topic) as Topics : topic;

  return castedTopic ?? null;
}

/**
 * Safely converts a window tab type value to the WindowTabType enum type.
 * Handles string representations by parsing them to integers, and provides null safety.
 * Used to ensure consistent type handling when working with tab type values from various sources.
 * 
 * @param type - The window tab type value to convert (string, number, WindowTabType enum, or null/undefined)
 * @returns The corresponding WindowTabType enum value, or null if conversion fails
 */
export function toWindowTabType(type: string | number | WindowTabType | null | undefined): WindowTabType | null {
  const castedType = typeof type === 'string' ? parseInt(type) as WindowTabType : type;

  return castedType ?? null;
}

/**
 * Returns the appropriate FontAwesome icon class for a given topic.
 * Provides consistent iconography across the application for different content types.
 * 
 * @param topic - The topic to get an icon for
 * @returns The FontAwesome icon class name, or empty string for unknown topics
 */
export function getTopicIcon(topic: string | number | Topics | null | undefined) {
  switch (toTopic(topic)) {
    case Topics.Character: 
      return 'fa-user';
    case Topics.Location: 
      return 'fa-location-dot';   //'fa-place-of-worship';
    case Topics.Organization: 
      return 'fa-flag';
    case Topics.PC:
      return 'fa-user-ninja';
    default: 
      return '';
  }
}

/**
 * Returns the appropriate FontAwesome icon class for a given window tab type.
 * Provides consistent iconography for different types of application tabs.
 * 
 * @param type - The window tab type to get an icon for
 * @returns The FontAwesome icon class name, or empty string for unknown types
 * @throws {Error} If called with WindowTabType.Entry (entries should use topic icons instead)
 */
export function getTabTypeIcon(type: string | number | WindowTabType | null | undefined) {
  switch (toWindowTabType(type)) {
    case WindowTabType.Setting: 
      return 'fa-globe';
    case WindowTabType.Campaign: 
      return 'fa-signs-post';
    case WindowTabType.Session: 
      return 'fa-tent';
    case WindowTabType.Front:
      return 'fa-skull';
    case WindowTabType.Arc:
      return 'fa-route';  //'fa-book-open';
    case WindowTabType.StoryWeb:
      return 'fa-diagram-project';
    case WindowTabType.Entry:
      throw new Error('Tried to use getTabTypeIcon() for Entry');
    default: 
      return '';
  }
}

/** Formats a date to a locale-specific string */
export function formatDate(ISODate: string): string {
  return (new Date(ISODate)).toLocaleString(undefined, { 
    day: 'numeric', 
    month: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).replace(/\s*([AP]M)/i, (_, p1) => p1.toLowerCase()); // replace AM/PM with am/pm
}

export function topicToNodeType(topic: Topics): StoryWebNodeTypes {
  switch (topic) {
    case Topics.Character: return StoryWebNodeTypes.Character;
    case Topics.Location: return StoryWebNodeTypes.Location;
    case Topics.Organization: return StoryWebNodeTypes.Organization;
    case Topics.PC: return StoryWebNodeTypes.PC;
    default: throw new Error('Invalid topic in storyWebStore.topicToNodeType()');
  }
}

export function nodeTypeToTopic(type: StoryWebNodeTypes): Topics | null {
  switch (type) {
    case StoryWebNodeTypes.Character: return Topics.Character;
    case StoryWebNodeTypes.Location: return Topics.Location;
    case StoryWebNodeTypes.Organization: return Topics.Organization;
    case StoryWebNodeTypes.PC: return Topics.PC;
    default: return null;  // fronts, etc.
  }
}

/** Maps an entry or an entry index to an option for a typeahead */
export const mapEntryToOption = function(entry: EntryBasicIndex | Entry) {
  return {
    id: entry.uuid,
    label: entry.type ? `${entry.name} (${entry.type})` : entry.name,
  };
};
