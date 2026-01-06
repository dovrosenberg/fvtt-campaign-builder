const fields = foundry.data.fields;

export const ArcVignetteSchema = () => (
  new fields.SchemaField({
    /** uuid  but our own, so just a string*/
    uuid: new fields.StringField({ required: true, nullable: false }),

    /** the vignette description */
    description: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }, { required: true, nullable: false} )
);