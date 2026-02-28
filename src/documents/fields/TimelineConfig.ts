const fields = foundry.data.fields;

export const TimelineConfigSchema = () => (
  new fields.SchemaField({
    /** filters */
    filters: new fields.SchemaField({
      categories: new fields.ArrayField(
        new fields.StringField({ required: true, nullable: false }), 
        { required: true, nullable: false }
      ),
      textSearch: new fields.StringField({ required: true, nullable: false, initial: '' }),
      gmOnly: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      referencedUuid: new fields.StringField({ required: true, nullable: false, initial: '' }),
    }, { required: true, nullable: false }),
  }, { required: true, nullable: false} )
);

