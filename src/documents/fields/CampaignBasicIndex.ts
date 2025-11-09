import { ArcBasicIndex, CampaignBasicIndex } from '@/types';
import { ArcBasicIndexSchema } from './ArcBasicIndex';

const fields = foundry.data.fields;

export const CampaignBasicIndexSchema = () => (
  new fields.SchemaField({
    /** uuid of the entry */
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
    
    /** the topic id (Topics enum) */
    name: new fields.StringField({ required: true, nullable: false }),
    
    /** is it marked completed? */
    completed: new fields.BooleanField({ required: true, nullable: false, initial: false }),

    /** arcs */
    arcs: new fields.ArrayField(ArcBasicIndexSchema(), 
      { required: true, nullable: false, initial: [] as ArcBasicIndex[] } )
  },
  { required: true, nullable: false, initial: {}as CampaignBasicIndex })
);

