import { schemas, StoryWebNode, StoryWebEdge } from './fields';

const fields = foundry.data.fields;

export const StoryWebSchema ={
  /** the campaign this web is in */
  campaignId: new fields.DocumentUUIDField({ required: true, nullable: false }),

  nodes: new fields.ArrayField(
    schemas.StoryWebNode(),
    { required: true, initial: [] }),
  edges: new fields.ArrayField(
    schemas.StoryWebEdge(),
    { required: true, initial: [] }),
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


