// contains the data for the tests

import { faker } from '@faker-js/faker';

export class LocationDescriptor {
  public name: string;

  constructor() {
    this.name = faker.location.city();
  }
}
