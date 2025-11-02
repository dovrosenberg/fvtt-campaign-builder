import { schemas } from './fields';
import type { Danger } from '@/types';

const fields = foundry.data.fields;

export const FrontSchema = {
  /** the campaign this front is in */
  campaignId: new fields.DocumentUUIDField({ required: true, nullable: false }),

  /** all the dangers */
  dangers: new fields.ArrayField(
    schemas.Danger(),
    { required: true, nullable: false, initial: [] as Danger[] }
  ),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** tags  */
  tags: schemas.Tags(),

  /** image URL */
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),
};

type FrontSchemaType = typeof FrontSchema;

export class FrontDataModel<Schema extends FrontSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): FrontSchemaType {
    return FrontSchema;
  }

  /** @override */
  // prepareBaseData(): void {
  // }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface FrontDoc extends JournalEntryPage {
  __type: 'FrontDoc';

  system: {
    campaignId: string;
    dangers: Danger[];
    customFields: Record<string, string>;
    img: string;
    tags: string[];
  };
}
