import { RelatedItemDetails, Topics, ValidTopic } from '@/types';

const fields = foundry.data.fields;
const entrySchema = {
  topic: new fields.NumberField({ required: true, nullable: false, validate: (value: number) => { return Object.values(Topics).includes(value); }, textSearch: true, }),
  type: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),

  relationships: new fields.ObjectField({ required: true, nullable: false, initial: {
    [Topics.Character]: {},
    [Topics.Event]: {},
    [Topics.Location]: {},
    [Topics.Organization]: {},
  } as Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>>   // all the things related to this item, grouped by topic
  }),    // keyed by topic, then entryId

  // we store these separately, for simplicity... for now, they're only used by one topic each
  scenes: new fields.ArrayField(new fields.DocumentUUIDField({blank: false, type: 'Scene'}), { required: true, initial: [] }),
  actors: new fields.ArrayField(new fields.DocumentUUIDField({blank: false, type: 'Actor'}), { required: true, initial: [] }),

  // description: new fields.SchemaField({
  //   short: new fields.HTMLField({required: false, blank: true})
  // }),
  // img: new fields.FilePathField({required: false, categories: ['IMAGE']}),
  // steps: new fields.ArrayField(new fields.StringField({blank: true}))
};

type EntrySchemaType = typeof entrySchema;

type RelationshipFieldType = Record<ValidTopic, Record<string,RelatedItemDetails<any, any>>>; 

export class EntryDataModel extends foundry.abstract.TypeDataModel<EntrySchemaType, JournalEntry> {
  static defineSchema(): EntrySchemaType {
    return entrySchema;
  }

  /** @override */
  prepareBaseData(): void {
    if (this.relationships)
      this.relationships = relationshipKeyReplace(this.relationships as RelationshipFieldType, false);
  }
}

// swap '.' and '!@' in relationship keys
// serialize = true means replace '.' with '_'
export const relationshipKeyReplace = (relationships: RelationshipFieldType, serialize: boolean): RelationshipFieldType => {
  const newRelationships = {} as RelationshipFieldType;

  for (const topic in relationships) {
    newRelationships[topic] = {};
  
    // keep the values, but do a string replace to swap '.' for '_'
    for (const entryId in relationships[topic]) {
      const newkey = serialize ? serializeEntryId(entryId) : deserializeEntryId(entryId);
      newRelationships[topic][newkey] = relationships[topic][entryId];
    }
  }

  return newRelationships;
};

const serializeEntryId = (entryId: string): string => { return entryId.replace(/\./g, '_'); };
const deserializeEntryId = (entryId: string): string => { return entryId.replace(/_/g, '.'); };

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface EntryDoc extends JournalEntryPage {
  system: {
    topic: ValidTopic;
    type: string;

    /** 
     * Keyed by topic, then entryId 
     */ 
    relationships: Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>>;  // keyed by topic then by entryId

    scenes: string[];
    actors: string[];
  };
}
