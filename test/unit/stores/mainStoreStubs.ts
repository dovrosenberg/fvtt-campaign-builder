import * as sinon from 'sinon';
import { setActivePinia } from 'pinia';
import { useMainStore } from '@/applications/stores';
import { FCBSetting } from '@/classes';
import { getTestPinia } from './testPinia';

/**
 * Main store stub configuration for tests
 */
export interface MainStoreStubs {
  store: ReturnType<typeof useMainStore>;
  getAllSettings: sinon.SinonStub;
}

/**
 * Creates stubbed main store using the shared test Pinia instance.
 * Call this in beforeEach to set up the stubbed store.
 * 
 * @param options - Optional configuration for stub behavior
 * @returns Object containing the store instance and individual stubs
 */
export const createMainStoreStubs = (options?: {
  settings?: FCBSetting[];
}): MainStoreStubs => {
  // Use the shared test Pinia instance
  const pinia = getTestPinia();
  setActivePinia(pinia);
  
  // Get the main store
  const store = useMainStore();
  
  // Create stub for getAllSettings
  // By default, returns an empty array to prevent tests from interfering with real settings
  const getAllSettings = sinon.stub(store, 'getAllSettings')
    .resolves(options?.settings ?? []);
  
  return {
    store,
    getAllSettings,
  };
};

/**
 * Updates the getAllSettings stub to return specific settings
 * Use this when you need to test with specific settings
 */
export const setMockSettings = (stubs: MainStoreStubs, settings: FCBSetting[]): void => {
  stubs.getAllSettings.resolves(settings);
};
