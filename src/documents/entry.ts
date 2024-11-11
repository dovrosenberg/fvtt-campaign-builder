import { RelatedItem, Topic, ValidTopic } from '@/types';

const fields = foundry.data.fields;
const entrySchema = {
  topic: new fields.NumberField({ required: true, nullable: false, validate: (value: number) => { return Object.values(Topic).includes(value); }, textSearch: true, }),
  type: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),

  // @todo - should it be JSON?
  relationships: new fields.ObjectField({ required: true, nullable: false, initial: {}}),  // Record<Topic, Record<string,RelatedItem[]>> keyed by topic, then entryId

  // description: new fields.SchemaField({
  //   short: new fields.HTMLField({required: false, blank: true})
  // }),
  // img: new fields.FilePathField({required: false, categories: ['IMAGE']}),
  // steps: new fields.ArrayField(new fields.StringField({blank: true}))
};
type EntrySchemaType = typeof entrySchema;

export class EntryDataModel<Schema extends EntrySchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): EntrySchemaType {
    return entrySchema;
  }

  // prepareDerivedData() {}
}


export interface Entry extends JournalEntryPage {
  system: {
    topic: ValidTopic | undefined;
    type: string | undefined;

    /** 
     * Keyed by topic, then entryId 
     */ 
    relationships: Record<Topic, Record<string, RelatedItem<any, any>[]>> | undefined;  
  }
}