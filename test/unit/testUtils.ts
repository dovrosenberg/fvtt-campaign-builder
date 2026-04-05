import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import * as sinon from 'sinon';
import { FCBSetting } from '@/classes';
import { GeneratorType } from '@/types';
import { moduleId } from '@/settings';
import GlobalSettingService from '@/utils/globalSettings';

/**
 * Global test utilities shared across all test batches.
 *
 * Provides:
 * - TestSettingManager: shared FCBSetting lifecycle with mutex + ref counting
 * - RollTableTestHelper: track and clean up RollTables created during tests
 * - SettingsTestHelper: backup/restore module settings to prevent test interference
 * - createBatch: standard batch registration with setup/teardown boilerplate
 * - fakeUuid: generate valid fake UUIDs for DocumentUUIDField validation
 */

// ─── Fake UUID Generation ───────────────────────────────────────────────

/**
 * Generate a fake but valid UUID for testing DocumentUUIDField validation.
 * The UUID passes Foundry's format validation but does not reference a real document.
 * Foundry validates: Type must be a valid document type, ID must be 16 alphanumeric chars.
 *
 * @param documentType - The Foundry document type (e.g., 'Scene', 'Actor', 'JournalEntry')
 * @returns A valid-format UUID string like 'Scene.abcdefghijklmnop'
 */
export const fakeUuid = (documentType: string): string => {
  const id = foundry.utils.randomID(16);
  return `${documentType}.${id}`;
};

/**
 * Generate a fake but valid UUID for an FCBJournalEntryPage (embedded document).
 * Works for: Entry, Campaign, Session, Arc, Front, StoryWeb, Setting.
 * The UUID passes Foundry's format validation but does not reference a real document.
 * Format: JournalEntry.parentId.JournalEntryPage.pageId
 *
 * @returns A valid-format embedded document UUID string
 */
export const fakeFCBJournalEntryPageUuid = (): string => {
  const parentId = foundry.utils.randomID(16);
  const pageId = foundry.utils.randomID(16);
  return `JournalEntry.${parentId}.JournalEntryPage.${pageId}`;
};

// ─── Batch Registration ────────────────────────────────────────────────

/**
 * Creates and registers a Quench test batch with standard setup/teardown.
 * Use this in every category index.ts to avoid duplicating boilerplate.
 *
 * @param batchName - Quench batch ID (e.g. 'campaign-builder.utils.appWindow')
 * @param displayName - Path shown in the Quench UI (e.g. '/utils/appWindow')
 * @param registerTests - Function that registers the test's describe/it blocks
 */
export const createBatch = (
  batchName: string,
  displayName: string,
  registerTests: (context: QuenchBatchContext) => void
) => {
  quench?.registerBatch(
    `campaign-builder.${batchName}`,
    (context: QuenchBatchContext) => {
      const { before, after } = context;

      // Standard batch-level setup
      before(async () => {
        await initializeTestSetting();
      });

      // Standard batch-level cleanup
      after(async () => {
        await cleanupTestSetting();
        sinon.restore();
      });

      // Register tests
      registerTests(context);
    },
    { displayName: `World & Campaign Builder: ${displayName}`, preSelected: false },
  );
};

// ─── TestSettingManager ────────────────────────────────────────────────

/**
 * Manages the shared test FCBSetting lifecycle with a mutex and reference counting.
 * The setting is created when the first batch initializes and deleted when the last
 * batch cleans up. Individual objects created within the setting don't need individual
 * cleanup since deleting the parent setting will cascade delete everything.
 */
class TestSettingManager {
  private setting: FCBSetting | undefined;
  private activeBatches = 0;
  private isLocked = false;
  private lockQueue: Array<() => void> = [];

  /**
   * Acquire lock to prevent race conditions
   */
  private async acquireLock(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve();
      } else {
        this.lockQueue.push(resolve);
      }
    });
  }

  /**
   * Release lock and process next in queue
   */
  private releaseLock(): void {
    const next = this.lockQueue.shift();
    if (next) {
      next();
    } else {
      this.isLocked = false;
    }
  }

  /**
   * Initialize the shared test setting.
   * Increments reference count for each calling batch.
   * @returns The shared test setting
   */
  async initialize(): Promise<FCBSetting> {
    await this.acquireLock();

    try {
      this.activeBatches++;

      if (this.setting) {
        return this.setting;
      }

      this.setting = (await FCBSetting.create(false, 'Global Test Setting'))!;
      // Register in global cache so mainStore.setNewSetting gets the same instance
      GlobalSettingService.updateGlobalSetting(this.setting);
      // Track any roll tables/folders created during setting initialization
      rollTableHelper.trackSettingTables(this.setting);
      return this.setting;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Get the current test setting.
   * @returns The shared test setting
   * @throws If the setting has not been initialized
   */
  get(): FCBSetting {
    if (!this.setting) {
      throw new Error('Test setting not initialized. Call initializeTestSetting() first.');
    }
    return this.setting;
  }

  /**
   * Decrements reference count and deletes the setting if no active batches remain.
   */
  async cleanup(): Promise<void> {
    await this.acquireLock();

    try {
      this.activeBatches = Math.max(0, this.activeBatches - 1);

      if (this.activeBatches === 0 && this.setting) {
        // Clean up any tracked RollTables before deleting the setting
        await rollTableHelper.cleanup();

        // Remove from global cache before deleting
        GlobalSettingService.removeGlobalSetting(this.setting.uuid);

        await this.setting.delete();
        this.setting = undefined;
      }
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Force cleanup the test setting (for emergency use).
   */
  async forceCleanup(): Promise<void> {
    await this.acquireLock();

    try {
      this.activeBatches = 0;
      if (this.setting) {
        // Remove from global cache before deleting
        GlobalSettingService.removeGlobalSetting(this.setting.uuid);

        await this.setting.delete();
        this.setting = undefined;
      }
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Get the current active batch count (for debugging).
   * @returns The number of active batches
   */
  getActiveBatchCount(): number {
    return this.activeBatches;
  }
}

/** Singleton manager for the shared test setting */
export const testSettingManager = new TestSettingManager();

// Backward-compat wrappers — use these in test files
export const initializeTestSetting = () => testSettingManager.initialize();
export const getTestSetting = () => testSettingManager.get();
export const cleanupTestSetting = () => testSettingManager.cleanup();
export const forceCleanupTestSetting = () => testSettingManager.forceCleanup();
export const getActiveBatchCount = () => testSettingManager.getActiveBatchCount();

// ─── RollTableTestHelper ──────────────────────────────────────────────

/**
 * Tracks RollTables and folders created during tests and cleans them up.
 * Encapsulates the track/cleanup pattern so test files don't need to repeat
 * the same boilerplate for every describe block.
 */
class RollTableTestHelper {
  private trackedTables: string[] = [];
  private trackedFolderIds: string[] = [];

  /**
   * Track a single RollTable UUID for cleanup.
   * @param uuid - The UUID of the RollTable to track
   */
  trackTable(uuid: string): void {
    if (!this.trackedTables.includes(uuid)) {
      this.trackedTables.push(uuid);
    }
  }

  /**
   * Track a folder ID for cleanup.
   * @param folderId - The ID of the folder to track
   */
  trackFolder(folderId: string): void {
    if (!this.trackedFolderIds.includes(folderId)) {
      this.trackedFolderIds.push(folderId);
    }
  }

  /**
   * Track all roll tables and folder from a setting's rollTableConfig.
   * Replaces the repeated 7-line pattern in test beforeEach blocks.
   * @param setting - The setting whose roll table config to track
   */
  trackSettingTables(setting: FCBSetting): void {
    const config = setting.rollTableConfig;
    if (config?.folderId) {
      this.trackFolder(config.folderId);
    }
    for (const type of Object.values(GeneratorType)) {
      const tableUuid = config?.rollTables[type];
      if (tableUuid)
        this.trackTable(tableUuid);
    }
  }

  /**
   * Delete all tracked RollTables and folders.
   * Called automatically by TestSettingManager.cleanup(), but can also
   * be called manually in afterEach for per-test cleanup.
   */
  async cleanup(): Promise<void> {
    // Delete folders first (will cascade delete tables inside them)
    for (const folderId of this.trackedFolderIds) {
      try {
        const folder = game.folders?.get(folderId);
        if (folder) {
          await folder.delete();
        }
      } catch (e) {
        // Folder may already be deleted or not exist - ignore
      }
    }
    this.trackedFolderIds = [];

    // Delete any orphaned tables not in the folders
    for (const uuid of this.trackedTables) {
      try {
        const table = await foundry.utils.fromUuid<RollTable>(uuid);
        if (table) {
          await table.delete();
        }
      } catch (e) {
        // Table may already be deleted (by folder cascade) or not exist - ignore
      }
    }
    this.trackedTables = [];
  }

  /**
   * Clear roll table config from a setting to avoid stale folder references.
   * @param setting - The setting whose config to clear
   */
  async clearConfig(setting: FCBSetting): Promise<void> {
    setting.rollTableConfig = null;
    await setting.save();
  }
}

/** Singleton helper for RollTable tracking and cleanup */
export const rollTableHelper = new RollTableTestHelper();

// Backward-compat wrappers
export const trackRollTable = (uuid: string) => rollTableHelper.trackTable(uuid);
export const trackRollTableFolder = (folderId: string) => rollTableHelper.trackFolder(folderId);
export const cleanupRollTables = () => rollTableHelper.cleanup();
export const clearRollTableConfig = () => rollTableHelper.clearConfig(testSettingManager.get());

// ─── SettingsTestHelper ───────────────────────────────────────────────

interface SettingsBackup {
  id: string;
  settings: Record<string, unknown>;
  resolve: () => void;
}

/**
 * Queue-based backup/restore system for module settings.
 * Ensures tests that modify settings don't interfere with each other.
 * Tests that only read settings don't need to use this helper.
 */
class SettingsTestHelper {
  private backupQueue: SettingsBackup[] = [];
  private isLocked = false;
  private currentBackupId: string | null = null;
  private originalSettings: Record<string, unknown> = {};

  /**
   * Snapshot all current module settings.
   * @returns A map of setting IDs to their current values
   */
  private getAllSettings(): Record<string, unknown> {
    const settings: Record<string, unknown> = {};

    for (const [id, setting] of game.settings.settings.entries()) {
      if (id.startsWith(moduleId + '.')) {
        // @ts-ignore
        const value = game.settings.get(moduleId, setting.key);
        settings[id] = value;
      }
    }

    return settings;
  }

  /**
   * Restore all module settings from a snapshot.
   * @param settings - The snapshot to restore
   */
  private restoreAllSettings(settings: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith(moduleId + '.')) {
        const settingKey = key.substring(moduleId.length + 1);

        // @ts-ignore
        game.settings.set(moduleId, settingKey, value);
      }
    }
  }

  /**
   * Process the next backup in the queue.
   */
  private processNextBackup(): void {
    if (this.backupQueue.length === 0) {
      this.isLocked = false;
      this.currentBackupId = null;
      return;
    }

    const next = this.backupQueue.shift()!;
    this.currentBackupId = next.id;

    // Restore the previous settings before giving control to the next test
    if (this.currentBackupId !== next.id) {
      this.restoreAllSettings(next.settings);
    }

    next.resolve();
  }

  /**
   * Backup module settings and wait for exclusive access.
   * Call this at the start of any test that modifies settings.
   */
  async backup(): Promise<void> {
    return new Promise<void>((resolve) => {
      const backupId = `backup-${Date.now()}-${Math.random()}`;

      // Store original settings on first backup
      if (Object.keys(this.originalSettings).length === 0) {
        this.originalSettings = this.getAllSettings();
      }

      const entry: SettingsBackup = {
        id: backupId,
        settings: this.getAllSettings(),
        resolve
      };

      this.backupQueue.push(entry);

      if (!this.isLocked) {
        this.isLocked = true;
        this.processNextBackup();
      }
    });
  }

  /**
   * Restore module settings and release exclusive access.
   * Call this in a finally block after backup().
   */
  async restore(): Promise<void> {
    if (!this.currentBackupId) {
      console.warn('restoreSettings called without active backup');
      return;
    }

    // Wait for any pending operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    // Restore the settings that were backed up
    const currentBackup = this.backupQueue.find(b => b.id === this.currentBackupId);
    if (currentBackup) {
      this.restoreAllSettings(currentBackup.settings);
    }

    this.processNextBackup();
  }

  /**
   * Force restore original settings (for emergency cleanup).
   */
  async forceRestoreOriginal(): Promise<void> {
    this.backupQueue = [];

    if (Object.keys(this.originalSettings).length > 0) {
      this.restoreAllSettings(this.originalSettings);
    }

    this.isLocked = false;
    this.currentBackupId = null;
  }
}

/** Singleton helper for settings backup/restore */
export const settingsHelper = new SettingsTestHelper();

// Backward-compat wrappers
export const backupSettings = () => settingsHelper.backup();
export const restoreSettings = () => settingsHelper.restore();
export const forceRestoreOriginalSettings = () => settingsHelper.forceRestoreOriginal();