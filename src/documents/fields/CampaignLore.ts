const fields = foundry.data.fields;

export const CampaignLoreSchema = () => (
  new fields.SchemaField({
    /** uuid  but our own, so just a string*/
    uuid: new fields.StringField({ required: true, nullable: false }),

    /** has it been flagged as delivered */
    delivered: new fields.BooleanField({ required: true, nullable: false }),

    /** has it been flagged as significant */
    significant: new fields.BooleanField({ required: true, nullable: false }),

    /** the lore description */
    description: new fields.StringField({ required: true, nullable: false }),

    /** a linked journal entry page */
    journalEntryPageId: new fields.DocumentUUIDField({ required: true, nullable: true, initial: null }),

    /** the sortOrder for the lore list */
    sortOrder: new fields.NumberField({ required: true, nullable: false, integer: true }),

    /** if it was delivered, in which session? */
    lockedToSessionId: new fields.DocumentUUIDField({ required: true, nullable: true }),

    /** if it was delivered, the name of the session */
    lockedToSessionName: new fields.StringField({ required: true, nullable: true}),
  }, { required: true, nullable: false} )
);
