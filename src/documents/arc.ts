import { Idea } from '@/types';
import { schemas } from './fields';

const fields = foundry.data.fields;

export interface ArcRelatedItem {
  uuid: string;
  notes: string;
}

export interface ArcLocation extends ArcRelatedItem {}

export interface ArcParticipant extends ArcRelatedItem {}

export interface ArcMonster extends ArcRelatedItem {}

export interface ArcLore {
  uuid: string;
  description: string;
  journalEntryPageId: string | null;
  sortOrder: number;
}

export const ArcSchema = {
  /** the campaign this arc is in */
  campaignId: new fields.DocumentUUIDField({ required: true, nullable: false }),

  /** the range of included sessions */
  startSessionNumber: new fields.NumberField({ required: true, nullable: false }),
  endSessionNumber: new fields.NumberField({ required: true, nullable: false }),

  /** sort order for arcs in campaign directory */
  sortOrder: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** image URL */
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),

  /** tags */
  tags: schemas.Tags(),

  /** array of locations */
  locations: new fields.ArrayField(
    schemas.ArcLocation(),
    { initial: [] as ArcLocation[] }
  ),  

  /** array of npcs/organizations */
  participants: new fields.ArrayField(
    schemas.ArcParticipant(),
    { initial: [] as ArcParticipant[] }
  ),  

  /** array of monsters */
  monsters: new fields.ArrayField(
    schemas.ArcMonster(),
    { initial: [] as ArcMonster[] }
  ),  

  /** array of lore */
  lore: new fields.ArrayField(
    schemas.ArcLore(),
    { initial: [] as ArcLore[] }
  ),    

  /** ideas */
  ideas: new fields.ArrayField(
    schemas.Idea(),
    { required: true, nullable: false, initial: [] as Idea[] }
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
    sortOrder: number;

    // campaign-like
    customFields: Record<string, string>;
    img: string;
    tags: string[];

    // session-like
    campaignId: string;
    locations: ArcLocation[];
    participants: ArcParticipant[];
    monsters: ArcMonster[];
    lore: ArcLore[];
  };
}
