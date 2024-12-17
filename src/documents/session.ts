import { ModuleId } from '@/settings';

const fields = foundry.data.fields;
const sessionSchema = {
  number: new fields.NumberField({ required: false, nullable: true, initial: null }),
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

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface SessionDoc extends JournalEntryPage {
  system: {
    number: number | null | undefined;
    description: string | undefined;
  };
}
