const fields = foundry.data.fields;
const sessionSchema = {
  number: new fields.NumberField({ required: true, nullable: false, }),
  description: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),


  // description: new fields.SchemaField({
  //   short: new fields.HTMLField({required: false, blank: true})
  // }),
  // img: new fields.FilePathField({required: false, categories: ['IMAGE']}),
  // steps: new fields.ArrayField(new fields.StringField({blank: true}))
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


export interface Session extends JournalEntryPage {
  system: {
    number: number | undefined;
    description: string | undefined;
  };
}
