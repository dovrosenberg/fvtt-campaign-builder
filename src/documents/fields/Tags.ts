const fields = foundry.data.fields;

// an array of tag strings
export const TagsSchema = () => (
  new fields.ArrayField(
    new fields.StringField({ required: true, nullable: false }),
    { required: true, initial: [], }
  )
);