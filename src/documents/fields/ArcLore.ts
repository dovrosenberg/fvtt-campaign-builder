const fields = foundry.data.fields;

export const ArcLoreSchema = () => (
  new fields.SchemaField({
    /** uuid  but our own, so just a string*/
    uuid: new fields.StringField({ required: true, nullable: false }),

    /** the lore description */
    description: new fields.StringField({ required: true, nullable: false, initial: '' }),

    /** table group */
    groupId: new fields.StringField({ required: true, nullable: true, initial: null }),  // optional group ID

    /** a linked journal entry page */
    // TODO: remove once 1.8.6 migration isn't needed
    journalEntryPageId: new fields.DocumentUUIDField({ required: false, nullable: true, initial: null }),
}, { required: true, nullable: false} )
);