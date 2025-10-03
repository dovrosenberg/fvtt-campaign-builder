const fields = foundry.data.fields;

export const SessionLoreSchema = new fields.SchemaField({
  uuid: new fields.StringField({ required: true, nullable: false }),
  delivered: new fields.BooleanField({ required: true, nullable: false }),
  significant: new fields.BooleanField({ required: true, nullable: false }),
  description: new fields.StringField({ required: true, nullable: false, initial: '' }),
  journalEntryPageId: new fields.DocumentUUIDField({ required: true, nullable: true }),
  sortOrder: new fields.NumberField({ required: true, nullable: false, integer: true }),
}, { required: true, nullable: false} );
