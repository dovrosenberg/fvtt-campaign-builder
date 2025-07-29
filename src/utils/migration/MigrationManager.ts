/**
 * Main migration manager that coordinates all version migrations
 */

import { MigrationResult, MigrationContext, MigrationConstructor } from './types';
import { MigrationV1_2 } from './versions/MigrationV1_2';
import { VersionUtils } from '@/utils/version';
import { MigrationProgressDialog } from './MigrationProgressDialog';

/**
 * Manages all migrations for the Campaign Builder module
 */
export class MigrationManager {
  private static migrations: Record<string, MigrationConstructor> = {
    '1.2.0': MigrationV1_2
  };

  /**
   * Check if any migrations are needed
   */
  public static isMigrationNeeded(): boolean {
    const neededMigrations = this.getNeededMigrations();
    return neededMigrations.length > 0;
  }

  /**
   * Get all needed migrations for the version range
   */
  private static getNeededMigrations(): MigrationConstructor[] {
    const needed: MigrationConstructor[] = [];
    const lastVersion = VersionUtils.getLastKnownVersion();
    const currentVersion = VersionUtils.getCurrentModuleVersion();

    // any migration with a key greater than last known version and <= current version is needed
    //   (the second part of that is belt and suspenders, as it should never happen)
    for (const [version, migration] of Object.entries(MigrationManager.migrations)) {
      if (VersionUtils.compareVersions(version, lastVersion) > 0 && VersionUtils.compareVersions(version, currentVersion) <= 0) {
        needed.push(migration);
      }
    }

    return needed;
  }

  /**
   * Create migration context
   */
  private static createMigrationContext(): MigrationContext {
    return {
      dryRun: false
    };
  }

  /**
   * Perform all needed migrations
   */
  public static async performMigration(): Promise<MigrationResult> {
    const lastVersion = VersionUtils.getLastKnownVersion();
    const currentVersion = VersionUtils.getCurrentModuleVersion();

    console.log(`Starting migration from ${lastVersion} to ${currentVersion}`);

    const neededMigrations = this.getNeededMigrations();
    
    if (neededMigrations.length === 0) {
      return {
        success: true,
        migratedCount: 0,
        failedCount: 0,
        warnings: ['No migrations needed']
      };
    }

    return await MigrationProgressDialog.withProgress(
      'Module Migration',
      'Migrating your campaign data to the latest version...',
      async (progress) => {
        const overallResult: MigrationResult = {
          success: true,
          migratedCount: 0,
          failedCount: 0,
          errors: [],
          warnings: []
        };

        let totalMigrations = neededMigrations.length;
        let completedMigrations = 0;

        // Listen for progress events from migrations
        const progressListener = (event: CustomEvent) => {
          const { current, total, status } = event.detail;
          progress.updateProgress(current, total, status);
        };
        document.addEventListener('migration-progress', progressListener as EventListener);

        try {
          for (const migrationClass of neededMigrations) {
            let currentVersion: string = 'unknown';

            try {
              const context = this.createMigrationContext();
              const migration = new migrationClass(context);
              
              currentVersion = migration.targetVersion;
              progress.updateStatus(`Running migration for version ${currentVersion}...`);
              
              const result = await migration.migrate();
              
              if (result.success) {
                overallResult.migratedCount += result.migratedCount;
                if (result.warnings) {
                  overallResult.warnings?.push(...result.warnings);
                }
                progress.updateStatus(`Completed migration for version ${currentVersion}`);
              } else {
                overallResult.success = false;
                overallResult.failedCount += result.failedCount;
                if (result.errors) {
                  overallResult.errors?.push(...result.errors);
                }
                progress.updateStatus(`Migration failed for version ${currentVersion}`);
              }
            } catch (error) { 
              overallResult.success = false;
              const errorMsg = `Migration failed for version ${currentVersion}: ${error}`;
              overallResult.errors?.push(errorMsg);
              console.error(errorMsg);
              progress.updateStatus(`Migration failed for version ${currentVersion}`);
            }

            completedMigrations++;
            progress.updateProgress(completedMigrations, totalMigrations, 
              `Completed ${completedMigrations}/${totalMigrations} migrations`);
          }
        } finally {
          document.removeEventListener('migration-progress', progressListener as EventListener);
        }

        if (overallResult.success) {
          await VersionUtils.saveCurrentVersion();
        }

        return overallResult;
      }
    );
  }
  
  /**
   * Run a specific migration (for testing)
   */
  public static async runSpecificMigration(version: string, dryRun = false): Promise<MigrationResult> {
    const migrationClass = MigrationManager.migrations[version];
    if (!migrationClass) {
      return {
        success: false,
        migratedCount: 0,
        failedCount: 1,
        errors: [`Migration not found for version ${version}`]
      };
    }

    const context = {
      isWorldMigration: true,
      isCompendiumMigration: true,
      dryRun
    };

    const migration = new migrationClass(context);
    return await migration.migrate();
  }
}
