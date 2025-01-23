import { FlagSettings } from '@/settings';
import { SessionLore } from '@/documents/session';

// camapaigns are journal entries, not documents
export interface CampaignDoc extends JournalEntry {
  __type: 'CampaignDoc';
}

export enum CampaignFlagKey {
  isCampaign = 'isCampaign',    // used to mark the JE as a campaign
  description = 'description',
  lore = 'lore',
}

export type CampaignFlagType<K extends CampaignFlagKey> =
  K extends CampaignFlagKey.isCampaign ? true :
  K extends CampaignFlagKey.description ? string :
  K extends CampaignFlagKey.lore ? SessionLore[] :
  never;  

export const flagSettings = [
  {
    flagId: CampaignFlagKey.isCampaign,
    default: true,
  },
  {
    flagId: CampaignFlagKey.description,
    default: '' as string,
  },
  {
    flagId: CampaignFlagKey.lore,
    default: [] as SessionLore[],
  },
] as FlagSettings<CampaignFlagKey, {[K in CampaignFlagKey]: CampaignFlagType<K>}>[];

