import { Topic } from '.';

export type TablePagination = {
  first: number;   // the cardinal number of the first included row (=rowsPerPage*page)
  page: number;    // the current page
  rowsPerPage: number;
  totalRecords?: number | unknown;  // total number of rows available (not populated if rows not coming from the server)
  sortField: string;  // field to sort by
  sortOrder: 1 | -1 | null;  // sort direction
  filters: Record<string, string>;   // maps field name to filter value applied to it
}

export type CharacterRow = {

};
export type EventRow = {

};
export type LocationRow = {

};
export type OrganizationRow = {

};

export type AnyRow = CharacterRow | EventRow | LocationRow | OrganizationRow;

export type PaginationResult<T extends AnyRow> = {
  rows: T[];
  rowsAvailable: number;
}

export type AnyPaginationResult = PaginationResult<any>;

