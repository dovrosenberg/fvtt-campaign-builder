import { DataTableFilterMetaData } from 'primevue';

export interface BaseRow {
  uuid: string;
}

export type AnyRow = BaseRow & Record<string, any>;

export interface TablePagination {
  first: number;   // the cardinal number of the first included row (=rowsPerPage*page)
  page: number;    // the current page
  rowsPerPage: number;
  sortField: string;  // field to sort by
  sortOrder: 1 | -1 | undefined;  // sort direction
  filters: Record<string, { value: string | null; matchMode: DataTableFilterMetaData['matchMode']}>;   // maps field name to filter value applied to it
}

export interface ActionButtonDefinition {
  icon: string;

  /** receives the row data and optionally removedUUIDs (for delete actions with related entries tracking) */
  callback: ((data: Record<string, any> & { uuid: string }, removedUUIDs?: string[]) => void) | (() => void);

  tooltip: string;

  /** based on the data for the row, should it be displayed */
  display?: undefined | ((data: Record<string, any> & { uuid: string}) => boolean) | (() => void);

  /** if true, pressing the button activates row edit mode */
  isEdit?: boolean;
}

export interface BaseTableColumn {
  field:string; 
  header: string;
  editable?: boolean;
  style?: string;
  sortable?: boolean;
  smallEditBox?: boolean;
  type?: string;  
  onClick?: (event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) => void | Promise<void>;  // should a specific fn be called when the cell is clicked (also underlines the text)
};

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
  notes: string;
  delivered: boolean;
}
export interface ArcLocationDetails {
  uuid: string;   // the location entry
  name: string;
  type: string;
  parent: string;
  parentId: string | null;
  notes: string;
}
  
export interface SessionNPCDetails {
  uuid: string;   // the character entry
  name: string;
  type: string;
  notes: string;
  delivered: boolean;
}

export interface ArcParticipantDetails {
  uuid: string;   // the character entry
  name: string;
  type: string;
  notes: string;
}

export interface SessionItemDetails {
  uuid: string;   // the Item document
  name: string;
  delivered: boolean;
  notes: string;
  dragTooltip?: string;
}

export interface SessionMonsterDetails {
  uuid: string;   // the Actor document
  name: string;
  number: number;
  delivered: boolean;
  notes: string;
  dragTooltip?: string;
}

export interface ArcMonsterDetails {
  uuid: string;   // the Actor document
  name: string;
  notes: string;
}

export interface SessionLoreDetails {
  uuid: string;   
  delivered: boolean;
  description: string;
  significant: boolean;
  onClick?: (event: MouseEvent, uuid: string) => void | Promise<void>;
}

export interface ArcLoreDetails {
  uuid: string;  
  description: string; 
  onClick?: (event: MouseEvent, uuid: string) => void | Promise<void>;
}

export interface ArcVignetteDetails {
  uuid: string;
  description: string;
}

export interface CampaignLoreDetails extends SessionLoreDetails {
  /** uuid of the session it came from */
  lockedToSessionId: string | null;  
  lockedToSessionName: string | null;  
}

export interface RowEditCompleteEvent<T extends Record<string, any>=Record<string, any>> {
  /** the original row */
  data: T,

  /** new value */
  newData: T,

  /** row index */
  index: number;

  /** edit means a normal edit (like changing a checkbox);
   *    enter means user hit enter to submit the row
   */
  type: 'edit' | 'enter',  
}

export interface CellEditCompleteEvent<T=unknown> {
  /** the original row */
  data: Record<string, unknown> & { uuid: string },

  /** name of changed field */
  field: string,

  /** new value */
  newValue: T,

  /** original value */
  value: T,

  /** row index */
  index: number;

  /** edit means a normal edit (like changing a checkbox);
   *    enter means user hit enter to submit the row
   */
  type: 'edit' | 'enter',  
}

export enum ArcTableTypes {
  None,
  Location,
  Participant,
  Monster,
  Vignette,
  Lore,
  Idea,
}

export enum SessionTableTypes {
  None,
  Location,
  Item,
  NPC,
  Monster,
  Vignette,
  Lore,
}

export enum CampaignTableTypes {
  None,
  PC,
  Lore,
  DeliveredLore,
  ToDo,
  Idea,
}

