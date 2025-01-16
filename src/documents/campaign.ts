import { FlagSettings } from '@/settings';
import { RawLore, RawPC } from '@/classes';

// camapaigns are journal entries, not documents
export interface CampaignDoc extends JournalEntry {
  __type: 'CampaignDoc';
}

export enum CampaignFlagKey {
  isCampaign = 'isCampaign',    // used to mark the JE as a campaign
  description = 'description',
  pcs = 'pcs',   
  lore = 'lore',
}

export type CampaignFlagType<K extends CampaignFlagKey> =
  K extends CampaignFlagKey.isCampaign ? true :
  K extends CampaignFlagKey.description ? string :
  K extends CampaignFlagKey.pcs ? Record<string, RawPC> : 
  K extends CampaignFlagKey.lore ? Record<string, RawLore> :
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
    flagId: CampaignFlagKey.pcs,
    default: {} as Record<string, RawPC>,
    keyedByUUID: true,
  },
  {
    flagId: CampaignFlagKey.lore,
    default: {} as Record<string, RawLore>,
    keyedByUUID: true,
  },
] as FlagSettings<CampaignFlagKey, {[K in CampaignFlagKey]: CampaignFlagType<K>}>[];

