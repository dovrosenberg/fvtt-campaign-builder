import { TagInfo } from '@/types';

export interface SessionRelatedItem {
  uuid: string;
  delivered: boolean;
}

export interface SessionLocation extends SessionRelatedItem {}

export interface SessionItem extends SessionRelatedItem {}

export interface SessionNPC extends SessionRelatedItem {}

export interface SessionMonster extends SessionRelatedItem {
  number: number;
}

export interface SessionVignette extends SessionRelatedItem {
  description: string;
}

export interface SessionLore extends SessionRelatedItem {
  description: string;
  journalEntryPageId: string | null;
}

const fields = foundry.data.fields;
const sessionSchema = {
  number: new fields.NumberField({ required: true, nullable: false }),
  date: new fields.StringField({ required: true, nullable: true, initial: null, textSearch: false, }),
  startingAction: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  locations: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, }), { initial: [] as SessionLocation[] }),  
  npcs: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, }), { initial: [] as SessionNPC[] }),  
  items: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, }), { initial: [] as SessionItem[] }),  
  monsters: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, }), { initial: [] as SessionMonster[] }),  
  vignettes: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, }), { initial: [] as SessionVignette[] }),  
  lore: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, }), { initial: [] as SessionLore[] }),  
  img: new fields.FilePathField({blank: true, required: false, nullable: true, initial: '', categories: ['IMAGE']}),
  tags: new fields.ArrayField(
    new fields.ObjectField({ required: true, nullable: false, }), 
    { required: true, initial: [], }
  ),
};

type SessionSchemaType = typeof sessionSchema;

export class SessionDataModel<Schema extends SessionSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): SessionSchemaType {
    return sessionSchema;
  }

  /** @override */
  // prepareBaseData(): void {
  // }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface SessionDoc extends JournalEntryPage {
  __type: 'SessionDoc';

  system: {
    number: number;
    date: string | null;
    startingAction: string;
    locations: SessionLocation[];
    items: SessionItem[];
    npcs: SessionNPC[];
    monsters: SessionMonster[];
    vignettes: SessionVignette[];
    lore: SessionLore[];
    img: string;
    tags: TagInfo[];
  };
}
