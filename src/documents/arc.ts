import { schemas } from './fields';
import { SessionItem, SessionLocation, SessionLore, SessionMonster, SessionNPC, SessionVignette } from './session';

const fields = foundry.data.fields;

export const ArcSchema = {
  /** the campaign this arc is in */
  campaignId: new fields.DocumentUUIDField({ required: true, nullable: false }),

  /** the range of included sessions */
  startSessionNumber: new fields.NumberField({ required: true, nullable: false }),
  endSessionNumber: new fields.NumberField({ required: true, nullable: false }),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** image URL */
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),

  /** tags */
  tags: schemas.Tags(),

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
};

type ArcSchemaType = typeof ArcSchema;

export class ArcDataModel<Schema extends ArcSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): ArcSchemaType {
    return ArcSchema;
  }

  /** @override */
  // prepareBaseData(): void {
  // }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface ArcDoc extends JournalEntryPage {
  __type: 'ArcDoc';

  // arcs have some elements of a campaign and some elements of a session
  system: {
    startSessionNumber: number;
    endSessionNumber: number;

    // campaign-like
    customFields: Record<string, string>;
    img: string;
    tags: string[];

    // session-like
    campaignId: string;
    locations: SessionLocation[];
    items: SessionItem[];
    npcs: SessionNPC[];
    monsters: SessionMonster[];
    vignettes: SessionVignette[];
    lore: SessionLore[];
  };
}
