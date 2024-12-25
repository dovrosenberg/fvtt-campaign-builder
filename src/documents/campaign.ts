import { FlagSettings } from 'src/settings';

// camapaigns are journal entries, not documents
export interface CampaignDoc extends JournalEntry {}

export enum CampaignFlagKey {
  isCampaign = 'isCampaign',    // used to mark the JE as a campaign
  description = 'description',
  pcs = 'pcs',   // actor uuids
}

export type CampaignFlagType<K extends CampaignFlagKey> =
  K extends CampaignFlagKey.isCampaign ? true :
  K extends CampaignFlagKey.description ? string :
  K extends CampaignFlagKey.pcs ? string[] : 
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
    default: [] as string[],
  },
] as FlagSettings<CampaignFlagKey, {[K in CampaignFlagKey]: CampaignFlagType<K>}>[];

