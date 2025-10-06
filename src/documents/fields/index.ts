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
}