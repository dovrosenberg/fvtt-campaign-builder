const fields = foundry.data.fields;

export const ArcParticipantSchema = () => (
  new fields.SchemaField({
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
    notes: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }, { required: true, nullable: false} )
);