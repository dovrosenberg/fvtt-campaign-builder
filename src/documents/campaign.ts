import { RelatedJournal, SessionBasicIndex, ArcBasicIndex, TableGroup, GroupableItem, CampaignLore, CampaignToDo, CampaignIdea, CampaignPC } from '@/types';
import { DOCUMENT_TYPES } from './types';
import { schemas } from './fields';

const fields = foundry.data.fields;
export const CampaignSchema = {
  /** the session number of latest session */
  currentSessionNumber: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),

  /** the session id of latest session */
  currentSessionId: new fields.DocumentUUIDField({ required: true, nullable: true, initial: null }),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** the height of each custom field (in rem) */
  customFieldHeights: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  // we have to leave this until 1.8 migration is gone because otherwise the migration doesn't have access to it
  description: new fields.StringField({ required: true, nullable: true, initial: null, textSearch: true, }),

  /** high-level info for every contained session */
  sessionIndex: new fields.ArrayField(schemas.SessionBasicIndex(), 
    { required: true, nullable: false, initial: [] as SessionBasicIndex[] } 
  ),
    
  /** all the arcs */
  arcIndex: new fields.ArrayField(schemas.ArcBasicIndex(),
    { required: true, nullable: false, initial: [] as ArcBasicIndex[] }
  ),

  /** all the frontIds */
  frontIds: new fields.ArrayField(
    new fields.DocumentUUIDField({ required: true, nullable: false }),
    { required: true, nullable: false, initial: [] as string[] }
  ),

  /** all the storyWebIds; these are all the master ones */
  storyWebIds: new fields.ArrayField(
    new fields.DocumentUUIDField({ required: true, nullable: false }),
    { required: true, nullable: false, initial: [] as string[] }
  ),

  /** these are the ones attached to the campaign directly */
  storyWebs: new fields.ArrayField(
    new fields.DocumentUUIDField({ required: true, nullable: false }),
    { required: true, nullable: false, initial: [] as string[] }
  ),

  /** campaign lore */
  lore: new fields.ArrayField(
    schemas.CampaignLore(),
    { required: true, nullable: false, initial: [] as CampaignLore[] }
  ),  

  /** url of image */
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),   

  /** toDo items */
  // old case - we can remove this once the 1.9 migration is removed
  todoItems: new fields.ArrayField(
    schemas.ToDoItem(), 
    { required: true, nullable: false, initial: [] as CampaignToDo[] }
  ),
  toDoItems: new fields.ArrayField(
    schemas.ToDoItem(), 
    { required: true, nullable: false, initial: [] as CampaignToDo[] }
  ),

  /** ideas */
  ideas: new fields.ArrayField(
    schemas.Idea(),
    { required: true, nullable: false, initial: [] as CampaignIdea[] }
  ),

  /** consolidated groups structure */
  groups: new fields.SchemaField({
    // [GroupableItem.CampaignJournals]: schemas.GroupArray(),
    [GroupableItem.CampaignToDos]: schemas.GroupArray(),
    [GroupableItem.CampaignIdeas]: schemas.GroupArray(),
    [GroupableItem.CampaignLore]: schemas.GroupArray(),
    [GroupableItem.CampaignPCs]: schemas.GroupArray(),
  }, { required: true, nullable: false, initial: {
    // [GroupableItem.CampaignJournals]: [],
    [GroupableItem.CampaignToDos]: [],
    [GroupableItem.CampaignIdeas]: [],
    [GroupableItem.CampaignLore]: [],
    [GroupableItem.CampaignPCs]: [],
  } }),

  /** related journal entries */
  journals: new fields.ArrayField(
    schemas.RelatedJournal(),
    { required: true, nullable: false, initial: [] as RelatedJournal[] }
  ), 

  /** related PCs */
  pcs: new fields.ArrayField(
    schemas.RelatedPCDetails(),
    { required: true, nullable: false, initial: [] as CampaignPC[] }
  ),

  /** whether the campaign is marked as completed */
  completed: new fields.BooleanField({ required: true, nullable: false, initial: false }),

};

type SchemaType = typeof CampaignSchema;

export class CampaignDataModel<
  Schema extends SchemaType = SchemaType, 
  ParentNode extends JournalEntry = JournalEntry
> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): SchemaType {
    return CampaignSchema;
  }

  /** perform any needed migrations */
  // static migrateData(data: Record<string, unknown> ): CampaignDocModel['system'] {
  //   return data as CampaignDocModel['system'];
  // }

  // override prepareBaseData(): void {
  // }
}

export interface CampaignDocModel extends Omit<JournalEntryPage<typeof DOCUMENT_TYPES.Campaign>, 'system'> {
  __type: 'CampaignDoc'; 

  system: {
    currentSessionNumber: number;
    currentSessionId: string;
    customFields: Record<string, string>;
    customFieldHeights: Record<string, number>;
    sessionIndex: SessionBasicIndex[];
    arcIndex: ArcBasicIndex[];
    frontIds: string[];
    storyWebIds: string[];
    storyWebs: string[];
    lore: CampaignLore[];  
    img: string;   
    toDoItems: CampaignToDo[];
    ideas: CampaignIdea[];   
    journals: RelatedJournal[]; 
    pcs: CampaignPC[];
    groups: {
      toDoItems: TableGroup[];
      ideas: TableGroup[];
      lore: TableGroup[];
      pcs: TableGroup[];
    };
  };
}