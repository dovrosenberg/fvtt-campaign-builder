const fields = foundry.data.fields;

export const StoryWebNodeSchema = () => (
  new fields.SchemaField({
    uuid: new fields.StringField({ required: true, nullable: false }),
    label: new fields.StringField({ required: false, nullable: true }),
    type: new fields.StringField({ required: true, nullable: false, choices: ['character', 'location', 'organization', 'pc', 'danger', 'custom'] }),
    source: new fields.StringField({ required: true, nullable: false, choices: ['explicit', 'custom'] }),
  }, { required: true, nullable: false} )
);

export enum StoryWebNodeTypes {
  Character = 'character',
  Location = 'location',
  Organization = 'organization',
  PC = 'pc',
  Danger = 'danger',
  Custom = 'custom',
}

export enum StoryWebNodeSource {
  Explicit = 'explicit',
  Custom = 'custom',
}

export interface StoryWebNode {
  uuid: string;
  label?: string | null | undefined;
  type: StoryWebNodeTypes;
  source: StoryWebNodeSource;
}