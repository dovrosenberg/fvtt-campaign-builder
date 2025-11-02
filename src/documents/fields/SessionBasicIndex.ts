const fields = foundry.data.fields;
import { SessionBasicIndex } from '@/types';

export const SessionBasicIndexSchema = () => (
  new fields.SchemaField({
    /** uuid of the session */
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
    
    /** the topic id (Topics enum) */
    name: new fields.StringField({ required: true, nullable: false }),
    
    /** date of the session */
    date: new fields.StringField({ required: true, nullable: true, initial: null, textSearch: false, }),
    
    /** number */
    number: new fields.NumberField({ required: true, nullable: false, integer: true }),
  }, { required: true, nullable: false, initial: {} as SessionBasicIndex } )
);

