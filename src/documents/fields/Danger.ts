const fields = foundry.data.fields;

// danger has :
//  * name
//  * brief description
//  * impending doom - text
//  supporters
//    * participants (characters, locations, organizations) - link plus free text "Role in the danger"
//    * motivation
//  * Multiple grim portents - just text
//  opposition
//    * opposition - free text "Role in the danger"
//  *
/** represents either a participant or an opposition */
export interface DangerParticipant {
  uuid: string;    // links to a character, location, or organization
  role: string;
}

export const DangerSchema = () => 
  new fields.SchemaField({
    name: new fields.StringField({ required: true, nullable: false, initial: '' }),

    description: new fields.StringField({ required: true, nullable: false, initial: '' }),

    impendingDoom: new fields.StringField({ required: true, nullable: false, initial: ''}),

    /** danger's participants */
    participants: new fields.ArrayField(
      new fields.SchemaField({
        uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
        role: new fields.StringField({ required: true, nullable: false }),
      })
    ),

    /** danger's motivation */
    motivation: new fields.StringField({ required: true, nullable: false, initial: '' }),

    /** danger's opposition free text */
    opposition: new fields.ArrayField(
      new fields.SchemaField({
        uuid: new fields.DocumentUUIDField({ required: true, nullable: false }),
        role: new fields.StringField({ required: true, nullable: false }),
      })
    ),

    grimPortents: new fields.ArrayField(
      new fields.StringField({ required: true, nullable: false })
    ),
  });

export interface Danger {
  name: string;
  description: string;
  impendingDoom: string;
  motivation: string;
  opposition: DangerParticipant[];
  participants: DangerParticipant[];
  grimPortents: string[];
}
