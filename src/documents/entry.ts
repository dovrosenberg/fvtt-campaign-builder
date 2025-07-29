import { RelatedItemDetails, TagInfo, Topics, ValidTopic, RelatedJournal } from '@/types';

const fields = foundry.data.fields;
const entrySchema = {
  topic: new fields.NumberField({ required: true, nullable: false, validate: (value: number) => { return Object.values(Topics).includes(value); }, textSearch: true, }),
  type: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  tags: new fields.ArrayField(
    new fields.ObjectField({ required: true, nullable: false, }), 
    { required: true, initial: [], }
  ),

  relationships: new fields.ObjectField({ required: true, nullable: false, initial: {
    [Topics.Character]: {},
    [Topics.Location]: {},
    [Topics.Organization]: {},
    [Topics.PC]: {},
  } as Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>>   // all the things related to this item, grouped by topic
  }),    // keyed by topic, then entryId

  // we store these separately, for simplicity... for now, they're only used by one topic each
  scenes: new fields.ArrayField(new fields.DocumentUUIDField({blank: false, type: 'Scene'}), { required: true, initial: [] }),
  actors: new fields.ArrayField(new fields.DocumentUUIDField({blank: false, type: 'Actor'}), { required: true, initial: [] }),
  journals: new fields.ArrayField(new fields.SchemaField({
    uuid: new fields.StringField({ required: true, blank: false }),
    journalUuid: new fields.DocumentUUIDField({ required: true, type: 'JournalEntry' }),
    pageUuid: new fields.DocumentUUIDField({ required: false, type: 'JournalEntryPage', nullable: true, initial: null }),
    packId: new fields.StringField({ required: false, nullable: true, initial: null }),
    packName: new fields.StringField({ required: false, nullable: true, initial: null }),
  }), { required: true, initial: [] }),

  // used only for characters/pcs
  speciesId: new fields.StringField({ required: false, nullable: false, textSearch: false, }),

  // used only for pcs
  playerName: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  actorId: new fields.DocumentUUIDField({ required: false, nullable: true, }),
  background: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  plotPoints: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  magicItems: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),

  // Image for the entry
  img: new fields.FilePathField({blank: true, required: false, nullable: true, initial: '', categories: ['IMAGE']}),

  rolePlayingNotes: new fields.HTMLField({required: false, blank: true}),
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
  __type: 'EntryDoc';

  system: {
    rolePlayingNotes: string;
    topic: ValidTopic;
    type: string;
    tags: TagInfo[];

    /**
     * Keyed by topic, then entryId
     */
    relationships: Record<ValidTopic, Record<string, RelatedItemDetails<any, any>>>;  // keyed by topic then by entryId

    // for characters
    speciesId?: string | undefined;

    // for PCs
    playerName?: string | undefined;
    actorId?: string | undefined;   // uuid of the actor
    background?: string | undefined;
    plotPoints?: string | undefined;
    magicItems?: string | undefined; 

    img: string; 

    scenes: string[];
    actors: string[];
    journals: RelatedJournal[];
  };
}
