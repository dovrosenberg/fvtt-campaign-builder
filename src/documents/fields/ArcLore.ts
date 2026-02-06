const fields = foundry.data.fields;

export const ArcLoreSchema = () => (
  new fields.SchemaField({
    /** uuid  but our own, so just a string*/
    uuid: new fields.StringField({ required: true, nullable: false }),

    /** the lore description */
    description: new fields.StringField({ required: true, nullable: false, initial: '' }),

    /** a linked journal entry page */
    // TODO: remove once 1.8.6 migration isn't needed
    journalEntryPageId: new fields.DocumentUUIDField({ required: false, nullable: true }),
}, { required: true, nullable: false} )
);