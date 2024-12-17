import { RelatedItemDetails, Topic, ValidTopic } from '@/types';
import { ModuleId } from '@/settings';

const fields = foundry.data.fields;
const entrySchema = {
  topic: new fields.NumberField({ required: true, nullable: false, validate: (value: number) => { return Object.values(Topic).includes(value); }, textSearch: true, }),
  type: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),

  relationships: new fields.ObjectField({ required: true, nullable: false, initial: {
    [Topic.Character]: {},
    [Topic.Event]: {},
    [Topic.Location]: {},
    [Topic.Organization]: {},
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

export class EntryDataModel<Schema extends EntrySchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): EntrySchemaType {
    return entrySchema;
  }

  /** @override */
  prepareBaseData(): void {
    if (this.relationships)
      this.relationships = relationshipKeyReplace(this.relationships, false);
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

export interface EntryDoc extends JournalEntryPage {
  system: {
    type: `${ModuleId}.entry`;   

    topic: ValidTopic | undefined;
    entryType: string | undefined;

    /** 
     * Keyed by topic, then entryId 
     */ 
    relationships: Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>> | undefined;  // keyed by topic then by entryId

    scenes: string[];
    actors: string[];
  };
}
