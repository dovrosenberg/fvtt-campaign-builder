const fields = foundry.data.fields;

export const HierarchySchema = () => (
  new fields.SchemaField({
    parentId: new fields.StringField({ required: true, nullable: true }),

    ancestors: new fields.ArrayField(
      new fields.StringField({ required: true, nullable: false })
    ),

    children: new fields.ArrayField(
      new fields.StringField({ required: true, nullable: false })
    ),
    
    type: new fields.StringField({ required: true, nullable: false })
  }, { required: true, nullable: false} )
);
