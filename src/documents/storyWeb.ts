import { schemas } from './fields';

const fields = foundry.data.fields;

export interface StoryWebNode {
  uuid: string;
  label: string;
  type: 'character' | 'location' | 'organization' | 'pc' | 'front' | 'danger' | 'custom';
  source: 'manual' | 'relationship' | 'custom';
}

export interface StoryWebEdge {
  uuid: string;
  from: string;
  to: string;
  label: string;
  custom?: boolean; // true for custom node connections
}

export const StoryWebSchema {
  campaignId: fields.DocumentUUIDField({ required: true, nullable: false }),

  nodes: fields.ArrayField(
    schemas.StoryWebNode(),
  , { required: true, initial: [] }),
  edges: fields.ArrayField(
    schemas.StoryWebEdge(),
  , { required: true, initial: [] }),
};

type StoryWebSchemaType = typeof StoryWebSchema;

export class StoryWebDataModel<Schema extends StoryWebSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): StoryWebSchemaType {
    return StoryWebSchema;
  }

  /** @override */
  // prepareBaseData(): void {
  // }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface StoryWebDoc extends JournalEntryPage {
  __type: 'StoryWebDoc';

  system: {
    campaignId: string;
    nodes: StoryWebNode[];
    edges: StoryWebEdge[];
  };
}


