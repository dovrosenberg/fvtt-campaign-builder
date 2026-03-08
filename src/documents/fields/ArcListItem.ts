const fields = foundry.data.fields;

// used for items, monsters, locations, and participants
export const ArcListItemSchema = () => (
  new fields.SchemaField({
    uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),

    /** table group */
    groupId: new fields.StringField({ required: true, nullable: true, initial: null }),  // optional group ID

    notes: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }, { required: true, nullable: false} )
);
