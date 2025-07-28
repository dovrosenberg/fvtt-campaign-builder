import { DocumentUUID } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/utils/module.mjs';
import { ValidTopic, FieldData } from '@/types';

// lay out the extra fields for each combination of topics
export type FieldDataByTopic = Record<ValidTopic, Record<ValidTopic, FieldData>>;

export type RelatedItem<PrimaryTopic extends ValidTopic, RelatedTopic extends ValidTopic> = {
  uuid: string;   // the other item
  topic: PrimaryTopic;   
  type: string;   // the type of the item  (store here because it's not currently indexed, unlike name)
  extraFields: FieldDataByTopic[PrimaryTopic][RelatedTopic];   // optional fields depending on topics (ex. role for character/location relationship)
};

// includes additional details
export type RelatedItemDetails<PrimaryTopic extends ValidTopic, RelatedTopic extends ValidTopic> = RelatedItem<PrimaryTopic, RelatedTopic> & {
  name: string;
}

export type RelatedDocumentDetails = {
  uuid: string;   // the other item
  name: string;
  packId: string | null;   // uuid of the parent compendium (null if it's a setting compendium)
  packName: string | null;
};

/** used for rows in the various tables */
export type RelatedPCDetails = {
  uuid: string;
  name: string;
  type: string;
  actorId: string | null;
}

// ideally we'd use a getter to create the uuid, but these get serialized and it would
//    be a pain to try to add the function back
export type RelatedJournal = {
  uuid: string;  // composite key journalUuid|pageUuid
  journalUuid: DocumentUUID;
  pageUuid: DocumentUUID | null;
  packId: string | null;   // uuid of the parent compendium (null if it's a setting compendium)
  packName: string | null;
};

