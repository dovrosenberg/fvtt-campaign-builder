/**
 * Base interface for all migrations
 */
export interface Migration {
  /**
   * The version this migration targets
   */
  readonly targetVersion: string;

  /**
   * Description of what this migration does
   */
  readonly description: string;

  /**
   * Perform the migration
   */
  migrate(): Promise<MigrationResult>;

  /**
   * Rollback the migration (if possible)
   */
  rollback?(): Promise<void>;
}

/**
 * Result of a migration operation
 */
export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors?: string[];
  warnings?: string[];
  details?: Record<string, any>;
}

/**
 * Migration context that can be passed to migrations
 */
export interface MigrationContext {
  /**
   * The version of the module before any migrations were run
   */
  originalVersion: string;
  /**
   * If true, the migration should not make any changes
   */
  dryRun?: boolean;
}

export type MigrationConstructor = new (context: MigrationContext) => Migration;