import { faker } from '@faker-js/faker';
import { SessionDescriptor } from './session';

export class CampaignDescriptor {
  public name: string;
  public settings: SessionDescriptor[] = [];

  constructor() {
    this.name = faker.lorem.words({ min: 1, max: 4 })

    this.settings = [
      new SessionDescriptor(1),
      new SessionDescriptor(2),
    ]
  }
}
