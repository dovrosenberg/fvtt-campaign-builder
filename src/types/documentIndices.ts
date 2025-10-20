import { DOCUMENT_TYPES } from '@/documents';
import { ValidTopic } from '.';

/** the type available on the getIndex() for sessions; ties to the fields called for in the config */
export type SessionIndex = {
  type: typeof DOCUMENT_TYPES.Session;
  name: string;
  uuid: string;

  pages: {
    uuid: string;
    name: string;
    system: {
      number: number;  
    }
  }[]
}

/** the type available on the getIndex() for sessions; ties to the fields called for in the config */
export type EntryIndex = {
  type: typeof DOCUMENT_TYPES.Entry;
  name: string;
  uuid: string;

  pages: {
    uuid: string;
    name: string;
    system: {
      topic: ValidTopic;
      type: string;
    }
  }[]
}

/** the type available for use in filterSessions */
export type SessionFilterIndex = {
  name: string;
  uuid: string;
  number: number;  
}


/** the type available for use in filterEntries */
export type EntryFilterIndex = {
  name: string;
  id: string;
  uuid: string;
  topic: ValidTopic;
  type: string;
  actorId: string;  // for PCs
}
  