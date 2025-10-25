import { ValidDocType } from '@/types';

export enum JournalEntryFlagKey {
  // mark as journal entry as ours and show the type that's int it
  campaignBuilderType = 'campaignBuilderType',
  // track the original pack ID where the entry was created (persists when copied to world)
  originalPackId = 'originalPackId',
  // track the original UUID of the compendium entry (persists when copied to world)
  originalUuid = 'originalUuid'
}

export type JournalEntryFlagType<K extends JournalEntryFlagKey> =
  K extends JournalEntryFlagKey.campaignBuilderType ? ValidDocType :
  K extends JournalEntryFlagKey.originalPackId ? string :
  K extends JournalEntryFlagKey.originalUuid ? string :
  never

