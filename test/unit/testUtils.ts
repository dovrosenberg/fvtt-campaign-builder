import { FCBSetting } from '@/classes';

/**
 * Global test utilities shared across all test batches
 */

// Global shared test setting
let testSetting: FCBSetting | undefined;

// Reference counting to track active test batches
let activeBatches = 0;

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