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
 * Interface for a setting-specific generator configuration
 */
export interface WorldGeneratorConfig {
  /**
   * The folder ID where roll tables are stored for this setting
   */
  folderId: string;

  /**
   * Mapping of generator types to roll table IDs for this setting
   */
  rollTables: Record<GeneratorType, string>;  // maps generator type to uuid
}