import { Topic, ValidTopic } from '@/types';

// lay out the extra fields for each combination of topics
export type FieldDataByTopic = {
  [Topic.Character]: {
    [Topic.Character]: [];
    [Topic.Event]: [];
    [Topic.Location]: [{field:'role'; header:'Role'}];
    [Topic.Organization]: [{field:'role'; header:'Role'}];
  };
  [Topic.Event]: {
    [Topic.Character]: [];
    [Topic.Event]: [];
    [Topic.Location]: [];
    [Topic.Organization]: [];
  };
  [Topic.Location]: {
    [Topic.Character]: [{field:'role'; header:'Role'}];
    [Topic.Event]: [];
    [Topic.Location]: [];
    [Topic.Organization]: [];
  };
  [Topic.Organization]: {
    [Topic.Character]: [{field:'role'; header:'Role'}];
    [Topic.Event]: [];
    [Topic.Location]: [];
    [Topic.Organization]: [];
  };    
};

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
