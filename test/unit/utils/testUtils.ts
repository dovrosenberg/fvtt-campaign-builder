import { FCBSetting } from '@/classes';

/**
 * Shared test utilities for utils tests
 */
export let testSetting: FCBSetting | undefined;

/**
 * Initialize the shared test setting
 */
export const initializeTestSetting = async () => {
  testSetting = (await FCBSetting.create(false, 'Utils Test Setting'))!;
};

/**
 * Clean up the shared test setting
 */
export const cleanupTestSetting = async () => {
  if (testSetting) {
    await testSetting.delete();
    testSetting = undefined;
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
