// represents the topic grouping level (stored in a journalentry)
import { FlagSettings } from '@/settings';
import { Topics, ValidTopic } from '@/types';

// camapaigns are journal entries, not documents
export interface TopicDoc extends JournalEntry {
  __type: 'TopicDoc';
}

export enum TopicFlagKey {
  isTopic = 'isTopic',  // used to mark the JE as a topic
  topic = 'topic',  // the topic
  topNodes = 'topNodes',  // array of top-level nodes 
  types = 'types',  // array of valid types
}

export type TopicFlagType<K extends TopicFlagKey> =
  K extends TopicFlagKey.isTopic ? true :
  K extends TopicFlagKey.topic ? ValidTopic :
  K extends TopicFlagKey.topNodes ? string[] :    
  K extends TopicFlagKey.types ? string[] :
  never;  

export const flagSettings = [
  {
    flagId: TopicFlagKey.isTopic,
    default: true,
  },
  {
    flagId: TopicFlagKey.topic,
    default: Topics.Character,  // need to pick something
  },
  {
    flagId: TopicFlagKey.topNodes,
    default: [],
  },
  {
    flagId: TopicFlagKey.types,
    default: [],
  },
] as FlagSettings<TopicFlagKey, {[K in TopicFlagKey]: TopicFlagType<K>}>[];

