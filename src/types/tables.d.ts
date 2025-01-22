import { DataTableFilterMetaData } from 'primevue';

export type TablePagination = {
  first: number;   // the cardinal number of the first included row (=rowsPerPage*page)
  page: number;    // the current page
  rowsPerPage: number;
  sortField: string;  // field to sort by
  sortOrder: 1 | -1 | undefined;  // sort direction
  filters: Record<string, { value: string | null; matchMode: DataTableFilterMetaData['matchMode']}>;   // maps field name to filter value applied to it
}

export type FieldData = {
  field:string; 
  header: string;
  editable?: boolean;
  style?: string;
  sortable?: boolean;
}[];

export type PaginationResult<T extends AnyRow> = {
  rows: T[];
  rowsAvailable: number;
}

export type AnyPaginationResult = PaginationResult<any>;

export type PCDetails = {
    uuid: string;   // the other item
    name: string;
    playerName: string;
}

export type SessionLocationDetails = {
  uuid: string;   // the location entry
  name: string;
  delivered: boolean;
}

export type SessionNPCDetails = {
  uuid: string;   // the character entry
  name: string;
  delivered: boolean;
}

export type SessionItemDetails = {
  uuid: string;   // the Item document
  name: string;
  delivered: boolean;
}

export type SessionMonsterDetails = {
  uuid: string;   // the Actor document
  name: string;
  number: number;
  delivered: boolean;
}

export type SessionSceneDetails = {
  uuid: string;   // the Actor document
  description: string;
  delivered: boolean;
}