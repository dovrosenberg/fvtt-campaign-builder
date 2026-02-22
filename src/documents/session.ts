import { GroupableItem } from '@/types';
import type { 
  SessionLocation, 
  SessionItem, 
  SessionNPC, 
  SessionMonster, 
  SessionVignette, 
  SessionLore 
} from '@/types/dbTypes';
import { schemas } from './fields';

// Re-export types for backward compatibility
export type { 
  SessionLocation, 
  SessionItem, 
  SessionNPC, 
  SessionMonster, 
  SessionVignette, 
  SessionLore 
} from '@/types/dbTypes';

const fields = foundry.data.fields;

export const SessionSchema = {
  /** the campaign this session is in */
  campaignId: new fields.DocumentUUIDField({ required: true, nullable: false }),

  /** the session number */
  number: new fields.NumberField({ required: true, nullable: false }),

  /** date of the session */
  date: new fields.StringField({ required: true, nullable: true, initial: null, textSearch: false, }),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** the height of each custom field (in rem) */
  customFieldHeights: new fields.ObjectField({ required: true, nullable: false, initial: {} }),
  // we have to leave this until 1.8 migration is gone because otherwise the migration doesn't have access to it
  strongStart: new fields.StringField({ required: true, nullable: true, initial: null, textSearch: true, }),

  /** array of locations */
  locations: new fields.ArrayField(
    schemas.SessionLocation(),
    { initial: [] as SessionLocation[] }
  ),  

  /** array of npcs */
  npcs: new fields.ArrayField(
    schemas.SessionNPC(),
    { initial: [] as SessionNPC[] }
  ),  

  /** array of magical items */
  items: new fields.ArrayField(
    schemas.SessionItem(),
    { initial: [] as SessionItem[] }
  ),  

  /** array of monsters */
  monsters: new fields.ArrayField(
    schemas.SessionMonster(),
    { initial: [] as SessionMonster[] }
  ),  

  /** array of vignettes */
  vignettes: new fields.ArrayField(
    schemas.SessionVignette(),
    { initial: [] as SessionVignette[] }
  ),  

  /** array of lore */
  lore: new fields.ArrayField(
    schemas.SessionLore(),
    { initial: [] as SessionLore[] }
  ),  

  /** image URL */
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),

  /** array of tags */
  tags: schemas.Tags(),

  storyWebs: new fields.ArrayField(
    new fields.DocumentUUIDField({ required: true, nullable: false }),
    { required: true, nullable: false, initial: [] as string[] }
  ),

  /** consolidated groups structure */
  groups: new fields.SchemaField({
    [GroupableItem.SessionLore]: schemas.GroupArray(),
    [GroupableItem.SessionVignettes]: schemas.GroupArray(),
    [GroupableItem.SessionLocations]: schemas.GroupArray(),
    [GroupableItem.SessionNPCs]: schemas.GroupArray(),
    [GroupableItem.SessionMonsters]: schemas.GroupArray(),
    [GroupableItem.SessionItems]: schemas.GroupArray(),
  }, { required: true, nullable: false, initial: {
    [GroupableItem.SessionLore]: [],
    [GroupableItem.SessionVignettes]: [],
    [GroupableItem.SessionLocations]: [],
    [GroupableItem.SessionNPCs]: [],
    [GroupableItem.SessionMonsters]: [],
    [GroupableItem.SessionItems]: [],
  } }),
};

type SessionSchemaType = typeof SessionSchema;

export class SessionDataModel<Schema extends SessionSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): SessionSchemaType {
    return SessionSchema;
  }

  /** @override */
  // prepareBaseData(): void {
  // }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface SessionDoc extends JournalEntryPage {
  __type: 'SessionDoc';

  system: {
    campaignId: string;
    number: number;
    date: string | null;
    customFields: Record<string, string>;
    customFieldHeights: Record<string, number>;
    locations: SessionLocation[];
    items: SessionItem[];
    npcs: SessionNPC[];
    monsters: SessionMonster[];
    vignettes: SessionVignette[];
    lore: SessionLore[];
    img: string;
    tags: string[];
    storyWebs: string[];
  };
}
