import { DataTableFilterMetaData } from 'primevue';

export type TablePagination = {
  first: number;   // the cardinal number of the first included row (=rowsPerPage*page)
  page: number;    // the current page
  rowsPerPage: number;
  sortField: string;  // field to sort by
  sortOrder: 1 | -1 | undefined;  // sort direction
  filters: Record<string, { value: string | null; matchMode: DataTableFilterMetaData['matchMode']}>;   // maps field name to filter value applied to it
}

export type FieldData = {field:string; header: string}[];

export type PaginationResult<T extends AnyRow> = {
  rows: T[];
  rowsAvailable: number;
}

export type AnyPaginationResult = PaginationResult<any>;

