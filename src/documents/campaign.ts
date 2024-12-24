import { ModuleId } from '@/settings';

// camapaigns are journal entries, not documents
export interface CampaignDoc extends JournalEntry {}

export type CampaignFlags = Record<ModuleId, {
  isCampaign: boolean;
  description: string;
  pcs: string[];  // actor uuids
}>;
