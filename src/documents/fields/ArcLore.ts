const fields = foundry.data.fields;

export const ArcLoreSchema = () => (
  new fields.SchemaField({
    /** uuid  but our own, so just a string*/
    uuid: new fields.StringField({ required: true, nullable: false }),

    /** the lore description */
    description: new fields.StringField({ required: true, nullable: false, initial: '' }),

    /** a linked journal entry page */
    journalEntryPageId: new fields.DocumentUUIDField({ required: true, nullable: true }),

    /** the sortOrder for the lore list */
    sortOrder: new fields.NumberField({ required: true, nullable: false, integer: true }),
}, { required: true, nullable: false} )
);