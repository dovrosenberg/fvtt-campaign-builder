import { Hierarchy, RelatedJournal, SettingGeneratorConfig, Topics, ValidTopicRecord, } from '@/types';
import { ApiNamePreviewPost200ResponsePreviewInner } from '@/apiClient';
import { DOCUMENT_TYPES, } from './types';
import CleanKeysService from '@/utils/cleanKeys';
import { schemas } from './fields';
import { TopicBasicIndex, CampaignBasicIndex } from '@/types';

const fields = foundry.data.fields;
export const SettingSchema = {
  /** the topics; keyed by topic id (the Topics enum) */
  topics: new fields.SchemaField({
    [Topics.Character]: schemas.TopicBasicIndex(),
    [Topics.Location]: schemas.TopicBasicIndex(),
    [Topics.Organization]: schemas.TopicBasicIndex(),
    [Topics.PC]: schemas.TopicBasicIndex(),
  },
    { required: true, nullable: false, initial: {
      [Topics.Character]: { topic: Topics.Character, topNodes: [], types: [], entries: {} },
      [Topics.Location]: { topic: Topics.Location, topNodes: [], types: [], entries: {} },
      [Topics.Organization]: { topic: Topics.Organization, topNodes: [], types: [], entries: {} },
      [Topics.PC]: { topic: Topics.PC, topNodes: [], types: [], entries: {} },
    } }
  ),

  /** in-memory index of campaigns, arcs, and sessions */
  campaignIndex: new fields.ArrayField(schemas.CampaignBasicIndex(), { required: true, nullable: false, initial: [] as CampaignBasicIndex[] }),

  /** ids of nodes that are expanded in the tree (could be compendia or entries or subentries) - handles topic tree */
  expandedIds: new fields.ObjectField({ required: true, nullable: false, initial: {} as Record<string, boolean> }),

  /** the full tree hierarchy or null for topics without hierarchy */
  hierarchies: new fields.TypedObjectField(
    schemas.Hierarchy(),
    { required: true, nullable: false, initial: {} as Record<string, Hierarchy> }
  ),

  /** genre of the setting */
  genre: new fields.StringField({ required: true, nullable: false, initial: '' }),

  /** setting feeling of the setting */
  settingFeeling: new fields.StringField({ required: true, nullable: false, initial: '' }),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** the height of each custom field (in rem) */
  customFieldHeights: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** image path for the setting */
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),

  /** array of name styles to use for name generation */
  nameStyles: new fields.ArrayField(new fields.NumberField({ required: true, nullable: false }), { initial: [] as number[] }),

  /** setting-specific roll table configuration */
  rollTableConfig: new fields.ObjectField({ required: false, nullable: true, initial: null }),

  /** stored example names for each style with their genre and setting feeling */
  nameStyleExamples: new fields.SchemaField({
    genre: new fields.StringField({ required: true, nullable: false }),
    settingFeeling: new fields.StringField({ required: true, nullable: false }),
    examples: new fields.ArrayField(
      new fields.ObjectField({ required: true, nullable: false }),
      { required: true, nullable: false, initial: [] as ApiNamePreviewPost200ResponsePreviewInner[] }
    ),
    // @ts-ignore - complex type it couldn't get
  }, { required: true, nullable: false, initial: { genre: '', settingFeeling: '', examples: [] as ApiNamePreviewPost200ResponsePreviewInner[] } as NameStyleExamples }),

  /** related journal entries */
  journals: new fields.ArrayField(
    schemas.RelatedJournal(),
    { required: true, nullable: false, initial: [] as RelatedJournal[] }
  ), 
};

type SchemaType = typeof SettingSchema;

export class SettingDataModel<
  Schema extends SchemaType = SchemaType, 
  ParentNode extends JournalEntry = JournalEntry
> extends foundry.abstract.TypeDataModel<Schema, ParentNode> {
  static defineSchema(): SchemaType {
    return SettingSchema;
  }

  override prepareBaseData(): void {
    this.hierarchies = CleanKeysService.cleanKeysOnLoad(this.hierarchies);
    this.expandedIds = CleanKeysService.cleanKeysOnLoad(this.expandedIds);
  }
}

export interface NameStyleExamples { 
  genre: string; 
  settingFeeling: string; 
  examples: ApiNamePreviewPost200ResponsePreviewInner[] 
};

export interface SettingDocModel extends Omit<JournalEntryPage<typeof DOCUMENT_TYPES.Setting>, 'system'> {
  __type: 'FCBSettingDoc'; 

  system: {
    topics: ValidTopicRecord<TopicBasicIndex>
    campaignIndex: CampaignBasicIndex[];
    campaignNames: Record<string, string>;  
    expandedIds: Record<string, boolean>;  
    hierarchies: Record<string, Hierarchy>;  
    genre: string;  f
    settingFeeling: string;   
    img: string;   
    nameStyles: number[];   
    rollTableConfig: SettingGeneratorConfig | null;   
    nameStyleExamples: NameStyleExamples;   
    journals: RelatedJournal[]; 
    customFields: Record<string, string>;
    customFieldHeights: Record<string, number>;
  };
}
