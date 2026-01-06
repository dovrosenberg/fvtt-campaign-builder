const fields = foundry.data.fields;

export const ToDoItemSchema = () => (
  new fields.SchemaField({
    uuid: new fields.StringField({ required: true, nullable: false }),
    lastTouched: new fields.StringField({ required: true, nullable: true, initial: null }),  // ISO date
    manuallyUpdated: new fields.BooleanField({ required: true, nullable: false }),
    linkedUuid: new fields.StringField({ required: true, nullable: true, initial: null }),  // note: these might be vignette ids, etc. not doc uuid
    linkedText: new fields.StringField({ required: true, nullable: true, initial: null }),
    sessionUuid: new fields.DocumentUUIDField({ required: true, nullable: true, initial: null }),
    text: new fields.StringField({ required: true, nullable: false }),
    type: new fields.StringField({ required: true, nullable: false }),
  }, { required: true, nullable: false} )
);
