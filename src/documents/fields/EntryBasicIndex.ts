import { EntryBasicIndex } from '@/types';

const fields = foundry.data.fields;

export const EntryBasicIndexSchema = () => (
  new fields.SchemaField({
    /** uuid of the entry */
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
    
    /** the topic id (Topics enum) */
    name: new fields.StringField({ required: true, nullable: false }),
    
    /** type */
    type: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }, { required: true, nullable: false, initial: {} as EntryBasicIndex } )
);

