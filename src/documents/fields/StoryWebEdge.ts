const fields = foundry.data.fields;

export const StoryWebEdgeSchema = () => (
  new fields.SchemaField({
    /** uuid of 1st node : uuid of 2nd node (where the uuids are sorted alphabetically) */
    uuid: new fields.StringField({ required: true, nullable: false }),

    /** uuid of first node */
    from: new fields.StringField({ required: true, nullable: false }),

    /** uuid of second node */
    to: new fields.StringField({ required: true, nullable: false }),
 
    /** label for edge */
    label: new fields.StringField({ required: true, nullable: false, initial: '' }),
  }, { required: true, nullable: false} )
);

export interface StoryWebEdge {
  uuid: string;
  from: string;
  to: string;
  label: string;
}
