/**
 * Main migration manager that coordinates all version migrations
 */

import { MigrationResult, MigrationContext, MigrationConstructor } from './types';
import { migrationVersions } from './versions';
import { VersionUtils } from '@/utils/version';
import { MigrationProgressDialog } from './MigrationProgressDialog';
import { notifyError } from '@/utils/notifications';
import { localize } from '@/utils/game';

/**
 * Manages all migrations for the Campaign Builder module
 */
export class MigrationManager {
  private static migrations: Record<string, MigrationConstructor> = migrationVersions;
  
  /**
   * Minimum version required to perform migrations.
   * If the last known version is below this, the user must upgrade to this version first.
   */
  private static readonly MINIMUM_VERSION = '1.3.1';
  /**
   * Tracks whether migration has failed. If true, the Campaign Builder should not be opened.
   */
  private static _migrationFailed = false;
  
  /**
   * Check if migration has failed
   */
  public static get migrationFailed(): boolean {
    return this._migrationFailed;
  }

  /**
   * Check if any migrations are needed
   */
  public static async isMigrationNeeded(): Promise<boolean> {
    const neededMigrations = await this.getNeededMigrations();
    return neededMigrations.length > 0;
  }

  /**
   * Get all needed migrations for the version range
   */
  private static async getNeededMigrations(): Promise<MigrationConstructor[]> {
    const needed: MigrationConstructor[] = [];
    const lastVersion = VersionUtils.getLastKnownVersion();  // version when we last did a migration
    const currentVersion = await VersionUtils.getCurrentModuleVersion();  // version currently running

    // if there's no prior version, no migration is needed
    if (lastVersion === '') {
      return needed;
    }

    // any migration with a key greater than last known version and <= current version is needed
    //   (the second part of that is belt and suspenders, as it should never happen)
    for (const [version, migration] of Object.entries(MigrationManager.migrations)) {
      if (VersionUtils.compareVersions(version, lastVersion) > 0 && VersionUtils.compareVersions(version, currentVersion) <= 0) {
        needed.push(migration);
      }
    }

    // sort the list by version so we do them in the right order
    const migrationContext = await this.createMigrationContext(lastVersion);
    needed.sort((a: MigrationConstructor, b: MigrationConstructor) => 
      VersionUtils.compareVersions(
        (new a(migrationContext)).targetVersion, 
        (new b(migrationContext)).targetVersion
      )
    );

    return needed;
  }

  /**
   * Create migration context with the original module version
   */
  private static async createMigrationContext(originalVersion: string): Promise<MigrationContext> {
    return {
      originalVersion,
      dryRun: false
    };
  }

  /**
   * Perform all needed migrations
   */
  public static async performMigration(): Promise<MigrationResult> {
    const lastVersion = VersionUtils.getLastKnownVersion();
    const currentVersion = await VersionUtils.getCurrentModuleVersion();

    // set to the new version if needed
    if (lastVersion === '') {
      await VersionUtils.saveCurrentVersion();
    }

    if (lastVersion === '' || lastVersion === currentVersion) {
      return {
        success: true,
        migratedCount: 0,
        failedCount: 0,
        warnings: ['No migrations needed']
      };
    }

    // if version went backward, though a danger message
    if (VersionUtils.compareVersions(lastVersion, currentVersion) > 0) {
      notifyError(`Version went backward from ${lastVersion} to ${currentVersion}. This is not expected - please report to module owner for next steps.`);
      this._migrationFailed = true;

      return {
        success: true,
        migratedCount: 0,
        failedCount: 0,
        warnings: ['No migrations needed']
      };
    }

    // Check if last version is below minimum required version
    if (VersionUtils.compareVersions(lastVersion, this.MINIMUM_VERSION) < 0) {
      const errorMsg = localize('notifications.migration.minimumVersionRequired')
        .replace('{0}', lastVersion)
        .replace('{1}', this.MINIMUM_VERSION)
        .replace('{2}', currentVersion);
      notifyError(errorMsg);
      console.error(errorMsg);
      this._migrationFailed = true;
      return {
        success: false,
        migratedCount: 0,
        failedCount: 1,
        errors: [errorMsg]
      };
    }

    console.log(`Starting migration from ${lastVersion} to ${currentVersion}`);

    const neededMigrations = await this.getNeededMigrations();
    
    if (neededMigrations.length === 0) {
      return {
        success: true,
        migratedCount: 0,
        failedCount: 0,
        warnings: ['No migrations needed']
      };
    }

    // Create a single context for all migrations to ensure consistent originalVersion
    const migrationContext = await this.createMigrationContext(lastVersion);
    
    return await MigrationProgressDialog.withProgress(
      'Migrating Campaign Builder to new version',
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
              const migration = new migrationClass(migrationContext);
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
              // If migration failed, stop processing further migrations
              if (!overallResult.success) {
                throw new Error(`Stopping migrations due to failure in version ${currentVersion}`);
              }
            } catch (error) { 
              overallResult.success = false;
              const errorMsg = `Migration failed for version ${currentVersion}: ${error}`;
              overallResult.errors?.push(errorMsg);
              console.error(errorMsg);
              progress.updateStatus(`Migration failed for version ${currentVersion}`);
              
              // Re-throw to break out of the loop
              throw error;
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
        } else {
          this._migrationFailed = true;
        }

        return overallResult;
      }
    );
  }
}
