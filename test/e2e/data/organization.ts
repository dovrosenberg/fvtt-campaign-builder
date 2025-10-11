// contains the data for the tests

import { faker } from '@faker-js/faker';

export class OrganizationDescriptor {
  public name: string;

  constructor() {
    this.name = faker.company.name();
  }
}
