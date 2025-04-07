/**
 * Enum for generator types used in the campaign builder
 */
export enum GeneratorType {
  NPC = 'npc',
  Town = 'town',
  Store = 'store',
  Tavern = 'tavern',
}

/**
 * Interface for a generator configuration
 */
export interface GeneratorConfig {
  /**
   * The folder ID where roll tables are stored
   */
  folderId: string;

  /**
   * Mapping of generator types to roll table IDs
   */
  rollTables: Record<GeneratorType, string>;  // maps generator type to uuid

  /** 
   * Default type to use for each thing that can be randomly generated
   */
  defaultTypes: Record<GeneratorType, string>;
}
