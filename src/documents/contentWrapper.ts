// represents the topic grouping level (stored in a journalentry)
import { FlagSettings } from '@/settings';
import { ContentType,  } from '@/types';

// camapaigns are journal entries, not documents
export interface ContentWrapperDoc extends JournalEntry {
  __type: 'ContentWrapper';
}

export enum ContentWrapperFlagKey {
  isContentWrapper = 'isContentWrapper',  // used to mark the JE as a topic
  contentType = 'contentType',  // the content type
}

export type ContentWrapperFlagType<K extends ContentWrapperFlagKey> =
  K extends ContentWrapperFlagKey.isContentWrapper ? true :
  K extends ContentWrapperFlagKey.contentType ? ContentType :
  never;  

export const flagSettings = [
  {
    flagId: ContentWrapperFlagKey.isContentWrapper,
    default: true,
  },
  {
    flagId: ContentWrapperFlagKey.contentType,
    default: -1,  // invalid
  },
] as FlagSettings<ContentWrapperFlagKey, {[K in ContentWrapperFlagKey]: ContentWrapperFlagType<K>}>[];

