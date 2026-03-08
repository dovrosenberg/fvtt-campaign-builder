import { GroupableItem, RelatedJournal, TimelineConfig } from '@/types';
import type { ArcLocation, ArcParticipant, ArcMonster, ArcItem, ArcVignette, ArcLore, ArcIdea } from '@/types/dbTypes';
import { schemas } from './fields';

// Re-export types for backward compatibility
export type { ArcLocation, ArcParticipant, ArcMonster, ArcItem, ArcVignette, ArcLore, ArcIdea } from '@/types/dbTypes';

const fields = foundry.data.fields;

export const ArcSchema = {
  /** the campaign this arc is in */
  campaignId: new fields.DocumentUUIDField({ required: true, nullable: false }),

  /** the range of included sessions */
  startSessionNumber: new fields.NumberField({ required: true, nullable: false }),
  endSessionNumber: new fields.NumberField({ required: true, nullable: false }),

  /** sort order for arcs in campaign directory */
  sortOrder: new fields.NumberField({ required: true, nullable: false, initial: 0 }),

  /** map from field name to value */
  customFields: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** the height of each custom field (in rem) */
  customFieldHeights: new fields.ObjectField({ required: true, nullable: false, initial: {} }),

  /** image URL */
  img: new fields.FilePathField({blank: true, required: true, nullable: false, initial: '', categories: ['IMAGE']}),

  /** tags */
  tags: schemas.Tags(),

  storyWebs: new fields.ArrayField(
    new fields.DocumentUUIDField({ required: true, nullable: false }),
    { required: true, nullable: false, initial: [] as string[] }
  ),

  /** timelines */
  timelines: new fields.ArrayField(
    schemas.TimelineConfig(),
    { required: true, nullable: false, initial: [] as TimelineConfig[] }
  ),

  /** consolidated groups structure */
  groups: new fields.SchemaField({
    // [GroupableItem.ArcJournals]: schemas.GroupArray(),
    [GroupableItem.ArcLore]: schemas.GroupArray(),
    [GroupableItem.ArcVignettes]: schemas.GroupArray(),
    [GroupableItem.ArcLocations]: schemas.GroupArray(),
    [GroupableItem.ArcParticipants]: schemas.GroupArray(),
    [GroupableItem.ArcMonsters]: schemas.GroupArray(),
    [GroupableItem.ArcItems]: schemas.GroupArray(),
    [GroupableItem.ArcIdeas]: schemas.GroupArray(),
  }, { required: true, nullable: false, initial: {
    // [GroupableItem.ArcJournals]: [],
    [GroupableItem.ArcLore]: [],
    [GroupableItem.ArcVignettes]: [],
    [GroupableItem.ArcLocations]: [],
    [GroupableItem.ArcParticipants]: [],
    [GroupableItem.ArcMonsters]: [],
    [GroupableItem.ArcItems]: [],
    [GroupableItem.ArcIdeas]: [],
  } }),

  /** related journal entries */
  journals: new fields.ArrayField(
    schemas.RelatedJournal(),
    { required: true, nullable: false, initial: [] as RelatedJournal[] }
  ), 

  /** array of locations */
  locations: new fields.ArrayField(
    schemas.ArcListItem(),
    { initial: [] as ArcLocation[] }
  ),  

  /** array of npcs/organizations */
  participants: new fields.ArrayField(
    schemas.ArcListItem(),
    { initial: [] as ArcParticipant[] }
  ),  

  /** array of monsters */
  monsters: new fields.ArrayField(
    schemas.ArcListItem(),
    { initial: [] as ArcMonster[] }
  ),  

  /** array of magic items */
  items: new fields.ArrayField(
    schemas.ArcListItem(),
    { initial: [] as ArcItem[] }
  ),

  /** array of vignettes */
  vignettes: new fields.ArrayField(
    schemas.ArcVignette(),
    { initial: [] as ArcVignette[] }
  ),

  /** array of lore */
  lore: new fields.ArrayField(
    schemas.ArcLore(),
    { initial: [] as ArcLore[] }
  ),    

  /** ideas */
  ideas: new fields.ArrayField(
    schemas.Idea(),
    { required: true, nullable: false, initial: [] as ArcIdea[] }
  ),
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

  // arcs have some elements of a campaign and some elements of a session
  system: {
    startSessionNumber: number;
    endSessionNumber: number;
    sortOrder: number;

    // campaign-like
    journals: RelatedJournal[]; 
    customFields: Record<string, string>;
    customFieldHeights: Record<string, number>;
    img: string;
    tags: string[];
    timelines: TimelineConfig[];

    // session-like
    campaignId: string;
    storyWebs: string[];
    locations: ArcLocation[];
    participants: ArcParticipant[];
    monsters: ArcMonster[];
    items: ArcItem[];
    vignettes: ArcVignette[];
    lore: ArcLore[];
  };
}
