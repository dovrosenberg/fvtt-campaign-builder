// contains the data for the tests

import { faker } from '@faker-js/faker';

export class CharacterDescriptor {
  public name: string;

  constructor() {
    this.name = faker.person.fullName();
  }
}
