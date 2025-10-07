const fields = foundry.data.fields;

// an array of objects that map a tag id to the count/color
// TODO - does this structure really make sense?
export const TagsSchema = () => (
  new fields.ArrayField(
    new fields.TypedObjectField(
      new fields.SchemaField({
          count: new fields.NumberField({ required: true, nullable: false }),
          color: new fields.StringField({ required: false, nullable: false }),
        },
        { required: true, nullable: false }
      ),
      { required: true, nullable: false }
    ), 
    { required: true, initial: [], }
  )
);