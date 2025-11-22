const fields = foundry.data.fields;

// danger has :
//  * name
//  * brief description
//  * impending doom - text
//  supporters
//    * participants (characters, locations, organizations) - link plus free text "Role in the danger"
//    * motivation
//  * Multiple grim portents - just text
//  *

export interface DangerParticipant {
  uuid: string;    // links to a character, location, or organization
  role: string;
}

export interface GrimPortent {
  uuid: string;
  description: string;
  complete: boolean;
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
        role: new fields.StringField({ required: true, nullable: false, initial: '' }),
      })
    ),

    /** danger's motivation */
    motivation: new fields.StringField({ required: true, nullable: false, initial: '' }),

    grimPortents: new fields.ArrayField(
      new fields.SchemaField({
        // uuid is just a random id, not a document uuid
        uuid: new fields.StringField({ required: true, nullable: false }),
        description: new fields.StringField({ required: true, nullable: false, initial: '',}),
        complete: new fields.BooleanField({ required: true, nullable: false, initial: false }),
      })
    ),
  });

export interface Danger {
  name: string;
  description: string;
  impendingDoom: string;
  motivation: string;
  participants: DangerParticipant[];
  grimPortents: GrimPortent[];
}
