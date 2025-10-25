import { SessionDescriptor } from './session';

export interface CampaignDescriptor {
  name: string;
  sessions: SessionDescriptor[];
}
