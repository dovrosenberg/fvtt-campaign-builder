import { RelatedItem, Topic, ValidTopic } from '@/types';

const fields = foundry.data.fields;
const entrySchema = {
  topic: new fields.NumberField({ required: true, nullable: false, validate: (value: number) => { return Object.values(Topic).includes(value); }, textSearch: true, }),
  type: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),

  // @todo - should it be JSON?
  relationships: new fields.ObjectField({ required: true, nullable: false, initial: {
    [Topic.Character]: {},
    [Topic.Event]: {},
    [Topic.Location]: {},
    [Topic.Organization]: {},
  }}),  // Record<Topic, Record<string,RelatedItem[]>> keyed by topic, then entryId

  // description: new fields.SchemaField({
  //   short: new fields.HTMLField({required: false, blank: true})
  // }),
  // img: new fields.FilePathField({required: false, categories: ['IMAGE']}),
  // steps: new fields.ArrayField(new fields.StringField({blank: true}))
};

type EntrySchemaType = typeof entrySchema;

type RelationshipFieldType = Record<Topic, Record<string,RelatedItem<any, any>[]>>; 

export class EntryDataModel<Schema extends EntrySchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema = function(): EntrySchemaType {
    return entrySchema;
  };

  /** @override */
  prepareBaseData = function(): void {
    this.data.relationships = relationshipKeyReplace(this.data.relationships, true);
  };
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


const serializeEntryId = (entryId: string): string => { return entryId.replace(/\./g, '_'); }
const deserializeEntryId = (entryId: string): string => { return entryId.replace(/_/g, '.'); }

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
