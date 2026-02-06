import { DocumentUUID } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/utils/module.mjs';
import { ValidTopic, BaseTableColumn } from '@/types';

// lay out the extra fields for each combination of topics
export type ColumnsByTopic = ValidTopicRecord<ValidTopicRecord<BaseTableColumn[]>>;

export interface RelatedEntry<PrimaryTopic extends ValidTopic, RelatedTopic extends ValidTopic> {
  uuid: string;   // the other item
  topic: PrimaryTopic;   
  type: string;   // the type of the item  (store here because it's not currently indexed, unlike name)
  extraFields: ColumnsByTopic[PrimaryTopic][RelatedTopic];   // optional fields depending on topics (ex. relationship for character/location)
}

// includes additional details
export interface RelatedEntryDetails<PrimaryTopic extends ValidTopic, RelatedTopic extends ValidTopic> extends RelatedEntry<PrimaryTopic, RelatedTopic> {
  name: string;
}

export interface RelatedDocumentDetails {
  uuid: string;   // the other item
  name: string;
  packId: string | null;   // uuid of the parent compendium (null if it's a setting compendium)
  packName: string | null;
};

/** used for rows in the various tables */
export interface RelatedPCDetails {
  uuid: string;
  name: string;
  type: string;
  playerName: string;
  actorId: string | null;
}

// ideally we'd use a getter to create the uuid, but these get serialized and it would
//    be a pain to try to add the function back
export interface RelatedJournal {
  uuid: string;  // composite key journalUuid|pageUuid|anchor-slug
  journalUuid: DocumentUUID;
  pageUuid: DocumentUUID | null;
  anchor: { slug: string; name: string; } | null;
  packId: string | null;   // uuid of the parent compendium (null if it's a world entry)
  packName: string | null;
};

