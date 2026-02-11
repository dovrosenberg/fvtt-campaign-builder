import { TableGroup } from '@/types';

const fields = foundry.data.fields;

export const GroupSchema = () => (
  new fields.SchemaField({
    /** unique id of the group */
    groupId: new fields.StringField({ required: true, nullable: false }),
    
    /** name of the group */
    name: new fields.StringField({ required: true, nullable: false }),
  }, { required: true, nullable: false } )
);

export const GroupArraySchema = () => (
  new fields.ArrayField(GroupSchema(), 
    { required: true, nullable: false, initial: [] as TableGroup[] } 
  )
);