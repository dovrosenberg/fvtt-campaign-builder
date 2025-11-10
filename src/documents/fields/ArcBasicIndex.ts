import { ArcBasicIndex, } from '@/types';

const fields = foundry.data.fields;

export const ArcBasicIndexSchema = () => (
  new fields.SchemaField({
    /** uuid of the entry */
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
    
    /** the topic id (Topics enum) */
    name: new fields.StringField({ required: true, nullable: false }),
    
    /** session range */
    startSessionNumber: new fields.NumberField({ required: true, nullable: false }),
    endSessionNumber: new fields.NumberField({ required: true, nullable: false }),

    /** sort order for arcs in campaign directory */
    sortOrder: new fields.NumberField({ required: true, nullable: false, initial: 0 }),
  },
  { required: true, nullable: false, initial: {} as ArcBasicIndex } )
);

