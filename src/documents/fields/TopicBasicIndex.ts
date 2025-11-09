import { EntryBasicIndex } from '@/types';
import { TopicSchema } from './Topic';
import { schemas } from './index';

const fields = foundry.data.fields;

export const TopicBasicIndexSchema = () => (
  new fields.SchemaField({
    /** the topic id (Topics enum) */
    topic: TopicSchema(),
    
    /** uuid of top-level nodes inside the topic */
    topNodes: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), { required: true, nullable: false, initial: [] as string[] }),

    /** high-level info for every contained entry */
    entries: new fields.ArrayField(schemas.EntryBasicIndex(), {
      required: true, 
      nullable: false, 
      initial: [] as EntryBasicIndex[] 
    }),

    /** array of the available types */
    types: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), { required: true, nullable: false, initial: [] as string[] }),
  }, { required: true, nullable: false} )
);
