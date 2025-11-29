const fields = foundry.data.fields;

export const StoryWebNodeSchema = () => (
  new fields.SchemaField({
    uuid: new fields.StringField({ required: true, nullable: false }),
    label: new fields.StringField({ required: true, nullable: true, default: null }),
    type: new fields.StringField({ required: true, nullable: false, choices: Object.values(StoryWebNodeTypes) }),
    source: new fields.StringField({ required: true, nullable: false, choices: Object.values(StoryWebNodeSource) }),
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
  Implicit = 'implicit',
  Custom = 'custom',
}


export interface StoryWebNode {
  uuid: string;
  label: string | null;
  type: StoryWebNodeTypes;
  source: StoryWebNodeSource;
}
