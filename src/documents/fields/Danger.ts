const fields = foundry.data.fields;

// danger has :
//    * name
//    * brief description
//  supporters
//    * figurehead (character, location, organization) - optional./.. should also be able to be freetext
//    * participants (characters, locations, organizations) - link plus free text "Role in the danger"
//    * motivation
//  opposition
//    * opposition
//  * impending doom - text
//  * Multiple grim portents - just text
//  *
export interface DangerParticipant {
  uuid: string;    // links to a character, location, or organization
  role: string;
}

export const DangerSchema = () => 
  new fields.SchemaField({
    name: new fields.StringField({ required: true, nullable: false, initial: '' }),

    description: new fields.StringField({ required: true, nullable: false, initial: '' }),

    impendingDoom: new fields.StringField({ required: true, nullable: false }),

    /** the link to an entry figurehead */
    figureheadLink: new fields.DocumentUUIDField({ required: false, nullable: true, initial: null }),

    /** freeform figurehead text */
    figureheadText: new fields.StringField({ required: false, nullable: true, initial: '' }),

    /** danger's motivation */
    motivation: new fields.StringField({ required: true, nullable: false, initial: '' }),

    /** danger's participants */
    participants: new fields.ArrayField(
      new fields.SchemaField({
        uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
        role: new fields.StringField({ required: true, nullable: false }),
      })
    ),

    /** danger's opposition free text */
    opposition: new fields.StringField({ required: true, nullable: false, initial: '' }),


    grimPortents: new fields.ArrayField(
      new fields.StringField({ required: true, nullable: false })
    ),

    /** map from field name to value */
    customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

    /** image URL */
    img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),
  });

export interface Danger {
  name: string;
  description: string;
  impendingDoom: string;
  figureheadLink: string | null;
  figureheadText: string;
  motivation: string;
  opposition: string;
  participants: DangerParticipant[];
  grimPortents: string[];
  customFields: Record<string, string>;
  img: string;
}
