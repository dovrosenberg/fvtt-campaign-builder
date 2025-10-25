const fields = foundry.data.fields;

export const SessionMonsterSchema = () => (
  new fields.SchemaField({
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
    delivered: new fields.BooleanField({ required: true, nullable: false }),
    number: new fields.NumberField({ required: true, nullable: false, integer: true }),
  }, { required: true, nullable: false} )
);