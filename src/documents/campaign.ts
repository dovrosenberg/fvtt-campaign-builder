import { SessionLore, } from '@/documents/session';
import { ToDoItem, Idea, RelatedJournal, RelatedPCDetails, SessionBasicIndex, ArcBasicIndex } from '@/types';
import { DOCUMENT_TYPES } from './types';
import { schemas } from './fields';

const fields = foundry.data.fields;
export const CampaignSchema = {
  /** campaign description */
  description: new fields.StringField({ required: true, nullable: false, initial: '' }),  

  /** the session number of latest session */
  currentSessionNumber: new fields.NumberField({ required: true, nullable: true, integer: true, initial: null }),

  /** the session id of latest session */
  currentSessionId: new fields.DocumentUUIDField({ required: true, nullable: true, initial: null }),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

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

  /** campaign lore */
  lore: new fields.ArrayField(
    schemas.CampaignLore(),
    { required: true, nullable: false, initial: [] as CampaignLore[] }
  ),  

  /** url of image */
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),   

  /** todo items */
  todoItems: new fields.ArrayField(
    schemas.ToDoItem(), 
    { required: true, nullable: false, initial: [] as ToDoItem[] }
  ),

  /** ideas */
  ideas: new fields.ArrayField(
    schemas.Idea(),
    { required: true, nullable: false, initial: [] as Idea[] }
  ),

  /** related journal entries */
  journals: new fields.ArrayField(
    schemas.RelatedJournal(),
    { required: true, nullable: false, initial: [] as RelatedJournal[] }
  ), 

  /** related PCs */
  pcs: new fields.ArrayField(
    schemas.RelatedPCDetails(),
    { required: true, nullable: false, initial: [] as RelatedPCDetails[] }
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

export type CampaignLore = SessionLore & {
  lockedToSessionId: string | null;  
  lockedToSessionName: string | null;  
}

export interface CampaignDocModel extends Omit<JournalEntryPage<typeof DOCUMENT_TYPES.Campaign>, 'system'> {
  __type: 'CampaignDoc'; 

  system: {
    currentSessionNumber: number;
    currentSessionId: string;
    description: string;
    customFields: Record<string, string>;
    sessionIndex: SessionBasicIndex[];
    arcIndex: ArcBasicIndex[];
    frontIds: string[];
    lore: CampaignLore[];  
    img: string;   
    todoItems: ToDoItem[];   
    ideas: Idea[];   
    journals: RelatedJournal[]; 
    pcs: RelatedPCDetails[];
  };
}