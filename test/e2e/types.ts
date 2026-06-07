/**
 * Local type definitions for e2e tests.
 * These are independent of Foundry to avoid pulling in Foundry-dependent code.
 */

// Topic enum matching the main codebase
export enum Topics {
  None = 0,
  Character = 1,
  Location = 2,
  Organization = 3,
  PC = 4,
}

// topics except None
export type ValidTopic = Exclude<Topics, Topics.None>;
