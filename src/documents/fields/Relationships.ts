import { RelatedItemDetails, Topics, ValidTopic, ValidTopicRecord } from '@/types';
import { TopicSchema } from './Topic';

const fields = foundry.data.fields;

export const RelatedItemDetailsSchema = () => (
  new fields.SchemaField({
    /** uuid of related entry */
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),

    /** name of related entry  */
    name: new fields.StringField({ required: true, nullable: false, initial: ''}),
        
    /** topic of ??? */
    topic: TopicSchema(),

    /** type of related entry */
    type: new fields.StringField({ required: true, nullable: true, initial: null }),  

    /** extrafields based on the relationship type */
    extraFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),
  }, { required: true, nullable: false} )
);

export const RelationshipsSchema = () => (
  new fields.SchemaField({
    [Topics.Character]: new fields.TypedObjectField(
      RelatedItemDetailsSchema(),
      { required: true, nullable: false, initial: {} as Record<string, RelatedItemDetails<any, any>> }
    ),
    [Topics.Location]: new fields.TypedObjectField(
      RelatedItemDetailsSchema(),
      { required: true, nullable: false, initial: {} as Record<string, RelatedItemDetails<any, any>> }
    ),
    [Topics.Organization]: new fields.TypedObjectField(
      RelatedItemDetailsSchema(),
      { required: true, nullable: false, initial: {} as Record<string, RelatedItemDetails<any, any>> }
    ),
    [Topics.PC]: new fields.TypedObjectField(
      RelatedItemDetailsSchema(),
      { required: true, nullable: false, initial: {} as Record<string, RelatedItemDetails<any, any>> }
    ),
  },
  { required: true, nullable: false, initial: {
      [Topics.Character]: {},
      [Topics.Location]: {},
      [Topics.Organization]: {},
      [Topics.PC]: {},
    } as ValidTopicRecord<Record<string, RelatedItemDetails<any, any>>>   // all the things related to this item, grouped by topic
  }
));
