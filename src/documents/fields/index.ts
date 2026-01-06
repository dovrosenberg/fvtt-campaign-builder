import { ToDoItemSchema } from './ToDoItem';
import { CampaignLoreSchema } from './CampaignLore';
import { IdeaSchema } from './Idea';
import { RelatedJournalSchema } from './RelatedJournal';
import { RelatedPCDetailsSchema } from './RelatedPCDetails';
import { HierarchySchema } from './Hierarchy';
import { SessionNPCSchema } from './SessionNPC';
import { SessionItemSchema } from './SessionItem';
import { SessionMonsterSchema } from './SessionMonster';
import { SessionVignetteSchema } from './SessionVignette';
import { SessionLoreSchema } from './SessionLore';
import { SessionLocationSchema } from './SessionLocation';
import { TagsSchema } from './Tags';
import { TopicSchema } from './Topic';
import { TopicBasicIndexSchema } from './TopicBasicIndex';
import { RelationshipsSchema, RelatedEntryDetailsSchema } from './Relationships';
import { EntryBasicIndexSchema } from './EntryBasicIndex';
import { SessionBasicIndexSchema } from './SessionBasicIndex';
import { ArcBasicIndexSchema } from './ArcBasicIndex';
import { CampaignBasicIndexSchema } from './CampaignBasicIndex';
import { DangerSchema } from './Danger';
import { ArcParticipantSchema } from './ArcParticipant';
import { ArcLocationSchema } from './ArcLocation';
import { ArcMonsterSchema } from './ArcMonster';
import { ArcLoreSchema } from './ArcLore';
import { ArcVignetteSchema } from './ArcVignette';
import { StoryWebNodeSchema } from './StoryWebNode';
import { StoryWebEdgeSchema } from './StoryWebEdge';

export type * from './Danger';
export type * from './StoryWebNode';
export type * from './StoryWebEdge';

export const schemas = {
  ToDoItem: ToDoItemSchema,
  CampaignLore: CampaignLoreSchema,
  Idea: IdeaSchema,
  Tags: TagsSchema,
  RelatedJournal: RelatedJournalSchema,
  RelatedPCDetails: RelatedPCDetailsSchema,
  Hierarchy: HierarchySchema,
  SessionNPC: SessionNPCSchema,
  SessionItem: SessionItemSchema,
  SessionMonster: SessionMonsterSchema,
  SessionVignette: SessionVignetteSchema,
  SessionLore: SessionLoreSchema,
  SessionLocation: SessionLocationSchema,
  Topic: TopicSchema,
  TopicBasicIndex: TopicBasicIndexSchema,
  RelatedEntryDetails: RelatedEntryDetailsSchema,
  Relationships: RelationshipsSchema,
  EntryBasicIndex: EntryBasicIndexSchema,
  SessionBasicIndex: SessionBasicIndexSchema,
  ArcBasicIndex: ArcBasicIndexSchema,
  CampaignBasicIndex: CampaignBasicIndexSchema,
  Danger: DangerSchema,
  ArcParticipant: ArcParticipantSchema,
  ArcLocation: ArcLocationSchema,
  ArcMonster: ArcMonsterSchema,
  ArcLore: ArcLoreSchema,
  ArcVignette: ArcVignetteSchema,
  StoryWebNode: StoryWebNodeSchema,
  StoryWebEdge: StoryWebEdgeSchema,
}

