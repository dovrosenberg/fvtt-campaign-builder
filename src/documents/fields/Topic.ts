const fields = foundry.data.fields;

export const TopicSchema = () => (
  new fields.SchemaField({
    /** the topic id (Topics enum) */
    topic: new fields.NumberField({ required: true, nullable: false }),
    
    /** uuid of top-level nodes inside the topic */
    topNodes: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), { required: true, nullable: false, initial: [] as string[] }),

    /** array of the available types */
    types: new fields.ArrayField(new fields.StringField({ required: true, nullable: false }), { required: true, nullable: false, initial: [] as string[] }),
  }, { required: true, nullable: false} )
);
