import { setActivePinia, createPinia, Pinia } from 'pinia';

/**
 * Shared Pinia instance for all test store stubs.
 * This ensures that all stubbed stores (backend, main, etc.) share the same Pinia instance,
 * preventing issues where one store stub overwrites another's Pinia.
 */

let testPinia: Pinia | undefined;

/**
 * Gets or creates the shared test Pinia instance.
 * Call this at the start of each test batch's before() hook.
 * 
 * @returns The shared Pinia instance
 */
export const getTestPinia = (): Pinia => {
  if (!testPinia) {
    testPinia = createPinia();
  }
  setActivePinia(testPinia);
  return testPinia;
};

/**
 * Resets the test Pinia instance.
 * Call this in after() to ensure a fresh Pinia for the next test batch.
 */
export const resetTestPinia = (): void => {
  testPinia = undefined;
};
