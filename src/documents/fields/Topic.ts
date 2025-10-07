const fields = foundry.data.fields;

export const TopicSchema = () => (
  new fields.SchemaField({
    /** the topic id (Topics enum) */
    topic: new fields.NumberField({ required: true, nullable: false }),
    
    /** uuid of top-level nodes inside the topic */
    topNodes: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), { required: true, nullable: false, initial: [] as string[] }),

    /** basic map of ids to names for every contained entry*/
    entries: new fields.ObjectField({ required: true, nullable: false, initial: {} as Record<string, string> }),

    /** array of the available types */
    types: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), { required: true, nullable: false, initial: [] as string[] }),
  }, { required: true, nullable: false} )
);

export type TopicFlatType = { 
  topic: string; 
  types: string[]; 
  topNodes: string[]; 
  entries: Record<string, string> 
};
