const fields = foundry.data.fields;

export const HierarchySchema = () => (
  new fields.SchemaField({
    parentId: new fields.StringField({ required: true, nullable: true }),

    /** for branches: the uuid of the location this branch is in */
    locationParentId: new fields.StringField({ required: true, nullable: true, initial: null }),

    ancestors: new fields.ArrayField(
      new fields.StringField({ required: true, nullable: false })
    ),

    children: new fields.ArrayField(
      new fields.StringField({ required: true, nullable: false })
    ),

    /** uuids of branches for this org or location */
    childBranches: new fields.ArrayField(
      new fields.StringField({ required: true, nullable: false }),
      { required: true, initial: [] }
    ),
    
    type: new fields.StringField({ required: true, nullable: false })
  }, { required: true, nullable: false} )
);
