const fields = foundry.data.fields;

export interface StoryWebNode {
  uuid: string;
  label: string;
  type: 'character' | 'location' | 'organization' | 'pc' | 'front' | 'danger' | 'custom';
  entryUuid?: string; // for non-custom nodes
  description?: string; 
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
  campaignId: new fields.DocumentUUIDField({ required: true, nullable: false }),
  nodes: new fields.ArrayField(new fields.SchemaField({
    uuid: new fields.StringField({ required: true, blank: false }),
    label: new fields.StringField({ required: true, blank: false }),
    type: new fields.StringField({ required: true, blank: false, choices: ['character', 'location', 'organization', 'pc', 'front', 'danger', 'custom'] }),
    entryUuid: new fields.StringField({ required: false, blank: true }),
    description: new fields.StringField({ required: false, blank: true }),
    source: new fields.StringField({ required: true, blank: false, choices: ['manual', 'relationship', 'custom'] }),
  }), { required: true, initial: [] }),
  edges: new fields.ArrayField(new fields.SchemaField({
    uuid: new fields.StringField({ required: true, blank: false }),
    from: new fields.StringField({ required: true, blank: false }),
    to: new fields.StringField({ required: true, blank: false }),
    label: new fields.StringField({ required: true, blank: false, initial: "" }),
    custom: new fields.BooleanField({ required: true, initial: false }),
  }), { required: true, initial: [] }),
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


