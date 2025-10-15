import { SessionDescriptor } from './session';

export type CampaignDescriptor = {
  name: string;
  sessions: SessionDescriptor[];
}
