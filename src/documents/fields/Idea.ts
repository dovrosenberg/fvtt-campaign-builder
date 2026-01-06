const fields = foundry.data.fields;

export const IdeaSchema = () => (
  new fields.SchemaField({
    /** uuid  but our own, so just a string*/
    uuid: new fields.StringField({ required: true, nullable: false }),

    /** the idea description */
    text: new fields.StringField({ required: true, nullable: false }),
  }, { required: true, nullable: false} )
);