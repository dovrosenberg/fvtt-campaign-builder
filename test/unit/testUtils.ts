import { FCBSetting } from '@/classes';
import { moduleId } from '@/settings';

/**
 * Global test utilities shared across all test batches
 */

// Global shared test setting
let testSetting: FCBSetting | undefined;

// Reference counting to track active test batches
let activeBatches = 0;

// Settings backup/restore queue system
interface SettingsBackup {
  id: string;
  settings: Record<string, any>;
  resolve: () => void;
}

let settingsBackupQueue: SettingsBackup[] = [];
let isSettingsLocked = false;
let currentBackupId: string | null = null;
let originalSettings: Record<string, any> = {};

// Mutex to prevent race conditions
let isLocked = false;
const lockQueue: Array<() => void> = [];

/**
 * Acquire lock to prevent race conditions
 */
const acquireLock = async (): Promise<void> => {
  return new Promise<void>((resolve) => {
    if (!isLocked) {
      isLocked = true;
      resolve();
    } else {
      lockQueue.push(resolve);
    }
  });
};

/**
 * Release lock and process next in queue
 */
const releaseLock = () => {
  const next = lockQueue.shift();
  if (next) {
    next();
  } else {
    isLocked = false;
  }
};

/**
 * Initialize the shared test setting
 * Increments reference count for each calling batch
 */
export const initializeTestSetting = async () => {
  await acquireLock();
  
  try {
    // Increment reference count
    activeBatches++;
    
    // If setting already exists, just return it
    if (testSetting) {
      return testSetting;
    }
    
    // Create new setting
    testSetting = (await FCBSetting.create(false, 'Global Test Setting'))!;
    return testSetting;
  } finally {
    releaseLock();
  }
};

/**
 * Get the current test setting
 */
export const getTestSetting = (): FCBSetting => {
  if (!testSetting) {
    throw new Error('Test setting not initialized. Call initializeTestSetting() first.');
  }
  return testSetting;
};

/**
 * Decrements reference count and queues cleanup if no active batches remain
 */
export const cleanupTestSetting = async () => {
  await acquireLock();
  
  try {
    // Decrement reference count
    activeBatches = Math.max(0, activeBatches - 1);
    
    // Only cleanup if there are no active batches
    if (activeBatches === 0 && testSetting) {
      await testSetting.delete();
      testSetting = undefined;
    }
  } finally {
    releaseLock();
  }
};

/**
 * Get the current active batch count (for debugging)
 */
export const getActiveBatchCount = (): number => {
  return activeBatches;
};

/**
 * Force cleanup the test setting (for emergency use)
 */
export const forceCleanupTestSetting = async () => {
  await acquireLock();
  
  try {
    activeBatches = 0;
    if (testSetting) {
      await testSetting.delete();
      testSetting = undefined;
    }
  } finally {
    releaseLock();
  }
};

/**
 * Get all current module settings
 */
const getAllSettings = (): Record<string, any> => {
  const settings: Record<string, any> = {};
  if (!game.settings?.settings?.get(moduleId)) {
    return settings;
  }
  
  const moduleSettings = game.settings.settings.get(moduleId)!;
  for (const [key, setting] of moduleSettings.entries()) {
    if (key.startsWith(moduleId + '.')) {
      const value = game.settings.get(moduleId, key.substring(moduleId.length + 1));
      settings[key] = value;
    }
  }
  
  return settings;
};

/**
 * Restore all module settings from a backup
 */
const restoreAllSettings = (settings: Record<string, any>) => {
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith(moduleId + '.')) {
      const settingKey = key.substring(moduleId.length + 1);
      game.settings.set(moduleId, settingKey, value);
    }
  }
};

/**
 * Process the next backup in the queue
 */
const processNextBackup = () => {
  if (settingsBackupQueue.length === 0) {
    isSettingsLocked = false;
    currentBackupId = null;
    return;
  }
  
  const next = settingsBackupQueue.shift()!;
  currentBackupId = next.id;
  
  // Restore the previous settings before giving control to the next test
  if (currentBackupId !== next.id) {
    restoreAllSettings(next.settings);
  }
  
  next.resolve();
};

/**
 * Backup module settings and wait for exclusive access
 * This ensures tests don't interfere with each other's settings
 */
export const backupSettings = async (): Promise<void> => {
  return new Promise<void>((resolve) => {
    const backupId = `backup-${Date.now()}-${Math.random()}`;
    
    // If this is the first backup, store the original settings
    if (Object.keys(originalSettings).length === 0) {
      originalSettings = getAllSettings();
    }
    
    const backup: SettingsBackup = {
      id: backupId,
      settings: getAllSettings(),
      resolve
    };
    
    settingsBackupQueue.push(backup);
    
    if (!isSettingsLocked) {
      isSettingsLocked = true;
      processNextBackup();
    }
  });
};

/**
 * Restore module settings and release exclusive access
 */
export const restoreSettings = async (): Promise<void> => {
  if (!currentBackupId) {
    console.warn('restoreSettings called without active backup');
    return;
  }
  
  // Wait for any pending operations to complete
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // Restore the settings that were backed up
  const currentBackup = settingsBackupQueue.find(b => b.id === currentBackupId);
  if (currentBackup) {
    restoreAllSettings(currentBackup.settings);
  }
  
  // Process the next backup in queue
  processNextBackup();
};

/**
 * Force restore original settings (for emergency cleanup)
 */
export const forceRestoreOriginalSettings = async (): Promise<void> => {
  // Clear the queue
  settingsBackupQueue = [];
  
  // Restore original settings
  if (Object.keys(originalSettings).length > 0) {
    restoreAllSettings(originalSettings);
  }
  
  isSettingsLocked = false;
  currentBackupId = null;
};