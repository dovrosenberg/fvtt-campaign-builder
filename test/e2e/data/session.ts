import { faker } from '@faker-js/faker';

export class SessionDescriptor {
  public name: string;
  public number: number;

  constructor(number: number) {
    this.name = faker.lorem.words({ min: 1, max: 4 })
    this.number = number;
  }
}
