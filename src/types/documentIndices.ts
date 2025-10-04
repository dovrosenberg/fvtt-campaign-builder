import { DOCUMENT_TYPES } from '@/documents';

/** the type available on the index for sessions; ties to the fields called for in the config */
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
  