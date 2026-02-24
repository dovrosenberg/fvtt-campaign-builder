import { RelatedEntryDetails, ValidTopic, RelatedJournal, ValidTopicRecord } from '@/types';
import { schemas } from './fields';
import CleanKeysService from '@/utils/cleanKeys';

const fields = foundry.data.fields;
export const EntrySchema = {
  topic: schemas.Topic(),
  type: new fields.StringField({ required: true, nullable: false, initial: '', textSearch: true, }),
  tags: schemas.Tags(),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** the height of each custom field (in rem) */
  customFieldHeights: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** keyed by topic, then entryId */
  relationships: schemas.Relationships(),

  // we store these separately, for simplicity... for now, they're only used by one topic each
  scenes: new fields.ArrayField(new fields.DocumentUUIDField({required: true, blank: false, type: 'Scene'}), { required: true, initial: [] }),
  actors: new fields.ArrayField(new fields.DocumentUUIDField({required: true, blank: false, type: 'Actor'}), { required: true, initial: [] }),
  journals: new fields.ArrayField(schemas.RelatedJournal(), { required: true, initial: [] }),

  // generic foundry doc storage
  foundryDocuments: new fields.ArrayField(new fields.DocumentUUIDField({required: true, blank: false }), { required: true, initial: [] }),

  // used only for characters/pcs
  speciesId: new fields.StringField({ required: false, nullable: false, textSearch: false, }),

  // used only for pcs
  playerName: new fields.StringField({ required: true, nullable: true, initial: null, textSearch: true, }),
  actorId: new fields.DocumentUUIDField({ required: true, nullable: true, initial: null }),

  // we have to leave this until 1.8 migration is gone because otherwise the migration doesn't have access to it
  background: new fields.StringField({ required: true, nullable: true, initial: null, textSearch: true, }),

  // Image for the entry
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),

  // Voice recording for characters
  voiceRecordingPath: new fields.FilePathField({required: false, nullable: true, initial: null, categories: ['AUDIO']}),
};

type EntrySchemaType = typeof EntrySchema;

export class EntryDataModel extends foundry.abstract.TypeDataModel<EntrySchemaType, JournalEntry> {
  static defineSchema(): EntrySchemaType {
    return EntrySchema;
  }

  /** @override */
  prepareBaseData(): void {
    if (this.relationships) {
      // Decode any protected keys back to normal
      this.relationships = CleanKeysService.cleanTopicKeysOnLoad(this.relationships);
    }
  }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface EntryDoc extends JournalEntryPage {
  __type: 'EntryDoc';

  system: {
    topic: ValidTopic;
    type: string;
    tags: string[];
    customFields: Record<string, string>;
    customFieldHeights: Record<string, number>;

    /**
     * Keyed by topic, then entryId
     */
    relationships: ValidTopicRecord<Record<string, RelatedEntryDetails<any, any>>>;  // keyed by topic then by entryId

    // for characters
    speciesId?: string | undefined;

    // for PCs
    playerName?: string | null;
    actorId?: string | null;   // uuid of the actor
    background?: string | null;
    plotPoints?: string | null;
    magicItems?: string | null; 

    img: string;

    // Voice recording for characters
    voiceRecordingPath?: string | null;

    scenes: string[];
    actors: string[];
    journals: RelatedJournal[];
    foundryDocuments: string[];
  };
}
