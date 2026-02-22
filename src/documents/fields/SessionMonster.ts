const fields = foundry.data.fields;

export const SessionMonsterSchema = () => (
  new fields.SchemaField({
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
    delivered: new fields.BooleanField({ required: true, nullable: false }),
    number: new fields.NumberField({ required: true, nullable: false, integer: true }),

    /** table group */
    groupId: new fields.StringField({ required: true, nullable: true, initial: null }),  // optional group ID

    notes: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }, { required: true, nullable: false} )
);