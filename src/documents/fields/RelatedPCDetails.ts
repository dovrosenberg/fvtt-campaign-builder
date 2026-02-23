const fields = foundry.data.fields;

export const RelatedPCDetailsSchema = () => (
  new fields.SchemaField({
    /** unique id */
    uuid: new fields.StringField({ required: true, nullable: false }),

    /** type of the PC */
    type: new fields.StringField({ required: true, nullable: false }),

    /** uuid of the actor, if assigned */
    actorId: new fields.DocumentUUIDField({ required: true, nullable: true }),

    /** table group */
    groupId: new fields.StringField({ required: true, nullable: true, initial: null }),  // optional group ID

  }, { required: true, nullable: false} )
);
