import CleanKeysService from '@/utils/cleanKeys';
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
  /** centralized position storage for all nodes keyed by UUID */
  positions: new fields.TypedObjectField(
    new fields.SchemaField({
      x: new fields.NumberField({ required: true, nullable: false }),
      y: new fields.NumberField({ required: true, nullable: false }),
    }),
    { required: true, nullable: false, initial: {} as Record<string, { x: number, y: number }> }
  ),
  
  /** edge styling information keyed by edge UUID */
  edgeStyles: new fields.TypedObjectField(
    new fields.SchemaField({
      /** color ID reference */
      colorId: new fields.StringField({ required: true, nullable: false }),

      /** style ID reference */
      styleId: new fields.StringField({ required: true, nullable: false }),
    }),
    { required: true, nullable: false, initial: {} as Record<string, { colorId: string, styleId: string }> }
  ),  
};

type StoryWebSchemaType = typeof StoryWebSchema;

export class StoryWebDataModel<Schema extends StoryWebSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): StoryWebSchemaType {
    return StoryWebSchema;
  }

  override prepareBaseData(): void {
    this.positions = CleanKeysService.cleanKeysOnLoad(this.positions);
    this.edgeStyles = CleanKeysService.cleanKeysOnLoad(this.edgeStyles);
  }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface StoryWebDoc extends JournalEntryPage {
  __type: 'StoryWebDoc';

  system: {
    campaignId: string;
    nodes: StoryWebNode[];
    edges: StoryWebEdge[];
    positions: Record<string, { x: number, y: number }>;
    edgeStyles: Record<string, { colorId: string, styleId: string }>;
  };
}


