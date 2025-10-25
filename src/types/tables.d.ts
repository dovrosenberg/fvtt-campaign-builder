import { DataTableFilterMetaData } from 'primevue';

export interface TablePagination {
  first: number;   // the cardinal number of the first included row (=rowsPerPage*page)
  page: number;    // the current page
  rowsPerPage: number;
  sortField: string;  // field to sort by
  sortOrder: 1 | -1 | undefined;  // sort direction
  filters: Record<string, { value: string | null; matchMode: DataTableFilterMetaData['matchMode']}>;   // maps field name to filter value applied to it
}

export interface FieldData {
  field:string; 
  header: string;
  editable?: boolean;
  style?: string;
  sortable?: boolean;
}[];

export interface PaginationResult<T extends AnyRow> {
  rows: T[];
  rowsAvailable: number;
}

export type AnyPaginationResult = PaginationResult<any>;

export interface SessionLocationDetails {
  uuid: string;   // the location entry
  name: string;
  type: string;
  parent: string;
  parentId: string | null;
  description: string;
  delivered: boolean;
}

export interface SessionNPCDetails {
  uuid: string;   // the character entry
  name: string;
  type: string;
  description: string;
  delivered: boolean;
}

export interface SessionItemDetails {
  uuid: string;   // the Item document
  name: string;
  delivered: boolean;
  dragTooltip?: string;
}

export interface SessionMonsterDetails {
  uuid: string;   // the Actor document
  name: string;
  number: number;
  delivered: boolean;
  dragTooltip?: string;
}


export interface SessionLoreDetails {
  uuid: string;   
  delivered: boolean;
  description: string;
  journalEntryPageId: string | null;  // the JournalEntryPage document
  journalEntryPageName: string | null;  
  significant: boolean;
  packId: string | null;  // compendium of the document
  sortOrder: number;
  onClick?: (event: MouseEvent, uuid: string) => void | Promise<void>;
}

export interface CampaignLoreDetails extends SessionLoreDetails {
  /** uuid of the session it came from */
  lockedToSessionId: string | null;  
  lockedToSessionName: string | null;  
}
