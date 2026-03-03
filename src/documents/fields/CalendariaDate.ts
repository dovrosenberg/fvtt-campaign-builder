const fields = foundry.data.fields;

export const CalendariaDateSchema = () => (
  new fields.SchemaField({
      year: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      month: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 0 }),
      day: new fields.NumberField({ required: true, nullable: false, integer: true, initial: 1 }),
      hour: new fields.NumberField({ required: false, nullable: false, integer: true, min: 0, max: 23 }),
  }, { required: true, nullable: false} )
);

