import { Topic } from '.';

export type TablePagination = {
  page: number;
  rowsPerPage: number;
  rowsNumber?: number;  // total number of rows available (not populated if rows not coming from the server)
  sortBy: string;  // field to sort by
  descending: boolean;  // sort direction
  filter: string;
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

