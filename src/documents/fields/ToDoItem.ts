const fields = foundry.data.fields;

export const ToDoItemSchema = () => (
  new fields.SchemaField({
    uuid: new fields.StringField({ required: true, nullable: false }),
    lastTouched: new fields.StringField({ required: true, nullable: true, initial: null }),  // ISO date
    manuallyUpdated: new fields.BooleanField({ required: true, nullable: false }),
    linkedUuid: new fields.DocumentUUIDField({ required: true, nullable: true }),
    linkedText: new fields.StringField({ required: true, nullable: true }),
    sessionUuid: new fields.DocumentUUIDField({ required: true, nullable: true }),
    text: new fields.StringField({ required: true, nullable: false }),
    type: new fields.StringField({ required: true, nullable: false }),
    sortOrder: new fields.NumberField({ required: true, nullable: false, integer: true }),
  }, { required: true, nullable: false} )
);
