import { DataModel } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs";

declare global {
  interface DataModelConfig {
    StoryWebDataModel: typeof StoryWebDataModel;
  }
}

export interface StoryWebNode {
  id: string;
  label: string;
  type: 'character' | 'location' | 'organization' | 'pc' | 'front' | 'danger' | 'custom';
  entryUuid?: string; // for non-custom nodes
  description?: string; 
  source: 'manual' | 'relationship' | 'custom';
}

export interface StoryWebEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  custom?: boolean; // true for custom node connections
}

export interface StoryWebConfig {
  id: string;
  name: string;
  manuallyAddedItems: string[]; // entry UUIDs
  nodes: StoryWebNode[];
  edges: StoryWebEdge[];
  createdAt: string;
  updatedAt: string;
}

export class StoryWebDataModel extends DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    
    return {
      campaignId: new fields.StringField({ required: true, blank: false, initial: "" }),
      name: new fields.StringField({ required: true, blank: false, initial: "New Story Web" }),
      config: new fields.SchemaField({
        id: new fields.StringField({ required: true, blank: false, initial: () => foundry.utils.randomID(16) }),
        name: new fields.StringField({ required: true, blank: false, initial: "New Story Web" }),
        manuallyAddedItems: new fields.ArrayField(new fields.StringField({ required: true, blank: false }), { required: true, initial: [] }),
        nodes: new fields.ArrayField(new fields.SchemaField({
          id: new fields.StringField({ required: true, blank: false }),
          label: new fields.StringField({ required: true, blank: false }),
          type: new fields.StringField({ required: true, blank: false, choices: ['character', 'location', 'organization', 'pc', 'front', 'danger', 'custom'] }),
          entryUuid: new fields.StringField({ required: false, blank: true }),
          description: new fields.StringField({ required: false, blank: true }),
          source: new fields.StringField({ required: true, blank: false, choices: ['manual', 'relationship', 'custom'] }),
        }), { required: true, initial: [] }),
        edges: new fields.ArrayField(new fields.SchemaField({
          id: new fields.StringField({ required: true, blank: false }),
          from: new fields.StringField({ required: true, blank: false }),
          to: new fields.StringField({ required: true, blank: false }),
          label: new fields.StringField({ required: true, blank: false, initial: "" }),
          custom: new fields.BooleanField({ required: true, initial: false }),
        }), { required: true, initial: [] }),
        createdAt: new fields.StringField({ required: true, blank: false, initial: () => new Date().toISOString() }),
        updatedAt: new fields.StringField({ required: true, blank: false, initial: () => new Date().toISOString() }),
      }, { required: true, initial: {} }),
    } as const;
  }

  get config(): StoryWebConfig {
    return this._source.config as StoryWebConfig;
  }
}
