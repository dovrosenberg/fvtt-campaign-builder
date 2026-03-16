const fields = foundry.data.fields;

export const StoryWebNodeSchema = () => (
  new fields.SchemaField({
    uuid: new fields.StringField({ required: true, nullable: false }),
    label: new fields.StringField({ required: true, nullable: true, default: null }),
    type: new fields.StringField({ required: true, nullable: false, choices: Object.values(StoryWebNodeTypes) }),
    source: new fields.StringField({ required: true, nullable: false, choices: Object.values(StoryWebNodeSource) }),
  }, { required: true, nullable: false} )
);

import { CustomFieldContentType } from '@/types/customFields';

export enum StoryWebNodeTypes {
  Character = 'character',
  Location = 'location',
  Organization = 'organization',
  Branch = 'branch',
  PC = 'pc',
  Danger = 'danger',
  Custom = 'custom',
}

/** Master mapping between StoryWebNodeTypes and CustomFieldContentTypes */
export const STORY_WEB_TO_CUSTOM_FIELD_MAP: Record<StoryWebNodeTypes, CustomFieldContentType | null> = {
  [StoryWebNodeTypes.Character]: CustomFieldContentType.Character,
  [StoryWebNodeTypes.Location]: CustomFieldContentType.Location,
  [StoryWebNodeTypes.Organization]: CustomFieldContentType.Organization,
  [StoryWebNodeTypes.Branch]: CustomFieldContentType.Branch,
  [StoryWebNodeTypes.PC]: CustomFieldContentType.PC,
  [StoryWebNodeTypes.Danger]: null, // Dangers don't have custom fields
  [StoryWebNodeTypes.Custom]: null, // Custom nodes don't have custom fields
};

/** Reverse mapping from CustomFieldContentTypes to StoryWebNodeTypes */
export const CUSTOM_FIELD_TO_STORYWEB_MAP: Partial<Record<CustomFieldContentType, StoryWebNodeTypes>> = {
  [CustomFieldContentType.Character]: StoryWebNodeTypes.Character,
  [CustomFieldContentType.Location]: StoryWebNodeTypes.Location,
  [CustomFieldContentType.Organization]: StoryWebNodeTypes.Organization,
  [CustomFieldContentType.Branch]: StoryWebNodeTypes.Branch,
  [CustomFieldContentType.PC]: StoryWebNodeTypes.PC,
  // Note: Setting, Arc, Front, Session, Campaign don't map to StoryWeb nodes
};

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
