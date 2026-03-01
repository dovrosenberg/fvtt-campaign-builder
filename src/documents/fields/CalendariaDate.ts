const fields = foundry.data.fields;

export const CalendariaDateSchema = () => (
  new fields.SchemaField({
      year: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      month: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      dayOfMonth: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
  }, { required: true, nullable: false} )
);

