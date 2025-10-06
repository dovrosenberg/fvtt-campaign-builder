const fields = foundry.data.fields;

export const SessionItemSchema = () => (
  new fields.SchemaField({
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
    delivered: new fields.BooleanField({ required: true, nullable: false }),
  }, { required: true, nullable: false} )
);