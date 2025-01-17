const fields = foundry.data.fields;
const sessionSchema = {
  number: new fields.NumberField({ required: true, nullable: false }),
  description: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
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
    description: string | undefined;
  };
}
