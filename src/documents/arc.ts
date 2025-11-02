//import { schemas } from './fields';

const fields = foundry.data.fields;

export const ArcSchema = {
  /** the campaign this arc is in */
  campaignId: new fields.DocumentUUIDField({ required: true, nullable: false }),

  /** all the sessionIds */
  sessionIds: new fields.ArrayField(
    new fields.DocumentUUIDField({ required: true, nullable: false }),
    { required: true, nullable: false, initial: [] as string[] }
  ),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** image URL */
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),
};

type ArcSchemaType = typeof ArcSchema;

export class ArcDataModel<Schema extends ArcSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): ArcSchemaType {
    return ArcSchema;
  }

  /** @override */
  // prepareBaseData(): void {
  // }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface ArcDoc extends JournalEntryPage {
  __type: 'ArcDoc';

  system: {
    //TODO
    // campaignId: string;
    // number: number;
    // date: string | null;
    // strongStart: string;
    // customFields: Record<string, string>;
    // locations: SessionLocation[];
    // items: SessionItem[];
    // npcs: SessionNPC[];
    // monsters: SessionMonster[];
    // vignettes: SessionVignette[];
    // lore: SessionLore[];
    // img: string;
    // tags: string[];
  };
}
