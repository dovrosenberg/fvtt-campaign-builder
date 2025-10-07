import { Topics } from '@/types';

const fields = foundry.data.fields;

export const TopicSchema = () => (
  new fields.NumberField({ 
    required: true, 
    nullable: false, 
    validate: (value: number) => { 
      return Object.values(Topics).includes(value); 
    }, 
    textSearch: true, }
));
