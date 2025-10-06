import { ValidDocType } from '@/types';

export enum JournalEntryFlagKey {
  // mark as journal entry as ours and show the type that's int it
  campaignBuilderType = 'campaignBuilderType'
}

export type JournalEntryFlagType<K extends JournalEntryFlagKey> =
  K extends JournalEntryFlagKey.campaignBuilderType ? ValidDocType :
  never

