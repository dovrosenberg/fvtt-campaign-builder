const fields = foundry.data.fields;

export const RelatedJournalSchema = () => (
  new fields.SchemaField({
    /** composite key journalUuid|pageUuid|anchor-slug */
    uuid: new fields.StringField({ required: true, nullable: false }),

    /** uuid of the journal entry */
    journalUuid: new fields.DocumentUUIDField({ required: true, nullable: false }),

    /** uuid of the journal entry page */
    pageUuid: new fields.DocumentUUIDField({ required: true, nullable: true }),

    /** anchor info  */
    anchor: new fields.SchemaField({
      slug: new fields.StringField({ required: true, nullable: false }),
      name: new fields.StringField({ required: true, nullable: false }),
    }, { required: true, nullable: true }),

    /** uuid of the parent compendium (null if it's a world entry) */
    packId: new fields.StringField({ required: true, nullable: true }),

    /** name of the parent compendium (null if it's a world entry) */
    packName: new fields.StringField({ required: true, nullable: true }),

  }, { required: true, nullable: false} )
);
