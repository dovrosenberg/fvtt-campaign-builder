export type SessionLocation = {
  uuid: string;
  delivered: boolean;
}

export type SessionItem = {
  uuid: string;
  delivered: boolean;
}

export type SessionNPC = {
  uuid: string;
  delivered: boolean;
}

const fields = foundry.data.fields;
const sessionSchema = {
  number: new fields.NumberField({ required: true, nullable: false }),
  date: new fields.StringField({ required: true, nullable: true, initial: null, textSearch: false, }),
  startingAction: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  locations: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, }), { initial: [] as SessionLocation[] }),  
  npcs: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, }), { initial: [] as SessionNPC[] }),  
  items: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false, }), { initial: [] as SessionItem[] }),  
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
  };
}
