import { DataTableFilterMetaData } from 'primevue';
import { 
  BaseTableGridRow,CampaignIdea,CampaignLore,CampaignPC,GroupableItem, 
  CampaignToDo, ArcIdea, ArcLore, ArcVignette, ArcLocation, ArcParticipant, 
  ArcMonster, ArcItem, SessionLore, SessionVignette, SessionLocation, SessionNPC, 
  SessionMonster, SessionItem,CampaignPCRow,CampaignLoreRow,CampaignIdeaRow,
  CampaignToDoRow,ArcLoreRow,ArcVignetteRow,ArcLocationRow,ArcParticipantRow,
  ArcMonsterRow,ArcItemRow,ArcIdeaRow,SessionLoreRow,SessionVignetteRow,SessionLocationRow,
  SessionNPCRow,SessionMonsterRow,SessionItemRow,SessionPCRow
} from './index';

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
  group?: string;
  editable?: boolean;
  style?: string;
  sortable?: boolean;
  smallEditBox?: boolean;
  type?: string;  
  onClick?: (event: MouseEvent, rowData: Record<string, unknown> & { uuid: string }) => void | Promise<void>;  // should a specific fn be called when the cell is clicked (also underlines the text)
};

export interface TableGroup {
  groupId: string;
  name: string;
}

export interface GroupedTableGridRow extends BaseTableGridRow {
  groupId?: string | null | undefined; // Only for data rows, not groups
}

export interface PaginationResult<T extends AnyRow> {
  rows: T[];
  rowsAvailable: number;
}

export type AnyPaginationResult = PaginationResult<any>;

// Note: *Details interfaces have been moved to rowTypes.ts with *Row naming convention
// e.g., SessionLocationDetails -> SessionLocationRow, ArcParticipantDetails -> ArcParticipantRow

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
  Item,
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

/**
 * Type mapping from GroupableItem to the corresponding item type on the document
 */
export type GroupableItemTypeMap = {
  // [GroupableItem.SettingJournals]: RelatedJournal;
  // [GroupableItem.CampaignJournals]: RelatedJournal;
  [GroupableItem.CampaignPCs]: CampaignPC;
  [GroupableItem.CampaignLore]: CampaignLore;
  [GroupableItem.CampaignIdeas]: CampaignIdea;
  [GroupableItem.CampaignToDos]: CampaignToDo;
  // [GroupableItem.ArcJournals]: RelatedJournal;
  [GroupableItem.ArcLore]: ArcLore;
  [GroupableItem.ArcVignettes]: ArcVignette;
  [GroupableItem.ArcLocations]: ArcLocation;
  [GroupableItem.ArcParticipants]: ArcParticipant;
  [GroupableItem.ArcMonsters]: ArcMonster;
  [GroupableItem.ArcItems]: ArcItem;
  [GroupableItem.ArcIdeas]: ArcIdea;
  [GroupableItem.SessionLore]: SessionLore;
  [GroupableItem.SessionVignettes]: SessionVignette;
  [GroupableItem.SessionLocations]: SessionLocation;
  [GroupableItem.SessionNPCs]: SessionNPC;
  [GroupableItem.SessionMonsters]: SessionMonster;
  [GroupableItem.SessionItems]: SessionItem;
  [GroupableItem.SessionPCs]: CampaignPC;  // Sessions use CampaignPC type
};

/**
 * Type mapping from GroupableItem to the corresponding row type dispayed in tables
 */
export type GroupableRowTypeMap = {
  // [GroupableItem.SettingJournals]: SettingJournalRow;
  // [GroupableItem.CampaignJournals]: CampaignJournalRow;
  [GroupableItem.CampaignPCs]: CampaignPCRow;
  [GroupableItem.CampaignLore]: CampaignLoreRow;
  [GroupableItem.CampaignIdeas]: CampaignIdeaRow;
  [GroupableItem.CampaignToDos]: CampaignToDoRow;
  // [GroupableItem.ArcJournals]: ArcJournalRow;
  [GroupableItem.ArcLore]: ArcLoreRow;
  [GroupableItem.ArcVignettes]: ArcVignetteRow;
  [GroupableItem.ArcLocations]: ArcLocationRow;
  [GroupableItem.ArcParticipants]: ArcParticipantRow;
  [GroupableItem.ArcMonsters]: ArcMonsterRow;
  [GroupableItem.ArcItems]: ArcItemRow;
  [GroupableItem.ArcIdeas]: ArcIdeaRow;
  [GroupableItem.SessionLore]: SessionLoreRow;
  [GroupableItem.SessionVignettes]: SessionVignetteRow;
  [GroupableItem.SessionLocations]: SessionLocationRow;
  [GroupableItem.SessionNPCs]: SessionNPCRow;
  [GroupableItem.SessionMonsters]: SessionMonsterRow;
  [GroupableItem.SessionItems]: SessionItemRow;
  [GroupableItem.SessionPCs]: SessionPCRow;
};
