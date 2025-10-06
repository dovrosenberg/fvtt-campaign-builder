const fields = foundry.data.fields;

export const TagsSchema = () => (
  new fields.ArrayField(
    new fields.TypedObjectField(
      new fields.StringField({ required: true, nullable: false }),
      { required: true, nullable: false }), 
    { required: true, initial: [], }
  )
);
