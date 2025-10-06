const fields = foundry.data.fields;

export const SessionVignetteSchema = () => (
  new fields.SchemaField({
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
    delivered: new fields.BooleanField({ required: true, nullable: false }),
    description: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }, { required: true, nullable: false} )
);