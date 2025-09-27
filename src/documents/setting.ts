import { Hierarchy, RelatedJournal, SettingGeneratorConfig, ValidTopic } from '@/types';
import { ApiNamePreviewPost200ResponsePreviewInner } from '@/apiClient';

const fields = foundry.data.fields;
const settingSchema = {
  /** the uuid for each topic */
  topicIds: new fields.ObjectField({ required: true, nullable: false, initial: {} as Record<ValidTopic, string> | Record<never, string> }),  

  /** name of each campaign; keyed by journal entry uuid */
  campaignNames: new fields.ObjectField({ required: true, nullable: false, initial: {} as Record<string, string> }),

  /** ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree */
  expandedIds: new fields.ObjectField({ required: true, nullable: false, initial: {} as Record<string, boolean> }),

  /** the full tree hierarchy or null for topics without hierarchy */
  hierarchies: new fields.ObjectField({ required: true, nullable: false, initial: {} as Record<string, Hierarchy> }),

  /** genre of the setting */
  genre: new fields.StringField({ required: true, nullable: false, initial: '' }),

  /** setting feeling of the setting */
  settingFeeling: new fields.StringField({ required: true, nullable: false, initial: '' }),

  /** image path for the setting */
  img: new fields.FilePathField({blank: true, required: false, nullable: true, initial: '', categories: ['IMAGE']}),

  /** array of name styles to use for name generation */
  nameStyles: new fields.ArrayField(new fields.NumberField({ required: true, nullable: false }), { initial: [] as number[] }),

  /** setting-specific roll table configuration */
  rollTableConfig: new fields.ObjectField({ required: false, nullable: true, initial: null }),

  /** stored example names for each style with their genre and setting feeling */
  nameStyleExamples: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), { initial: [] as { genre: string; settingFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] }[] }),

  /** related journal entries */
  journals: new fields.ArrayField(new fields.ObjectField({ required: true, nullable: false }), { initial: [] as RelatedJournal[] }),
};

type SettingSchemaType = typeof settingSchema;

export class SettingDataModel<Schema extends SettingSchemaType, ParentNode extends JournalEntry> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): SettingSchemaType {
    return settingSchema;
  }

  /** @override */
  // prepareBaseData(): void {
  // }
}

// @ts-ignore - error because ts can't properly handle the structure of JournalEntryPage
export interface SettingDoc extends JournalEntryPage {
  __type: 'SettingDoc';

  system: {
    name: string;  
    topicIds: Record<ValidTopic, string> | Record<never, string>;  
    campaignNames: Record<string, string>;  
    expandedIds: Record<string, boolean>;  
    hierarchies: Record<string, Hierarchy>;  
    genre: string;  
    settingFeeling: string;   
    img: string;   
    nameStyles: number[];   
    rollTableConfig: SettingGeneratorConfig | null;   
    nameStyleExamples: { genre: string; settingFeeling: string; examples: ApiNamePreviewPost200ResponsePreviewInner[] } | null;   
    journals: RelatedJournal[]; 
  };
}
