import * as sinon from 'sinon';
import { setActivePinia } from 'pinia';
import { useBackendStore } from '@/applications/stores';
import { getTestPinia } from './testPinia';

/**
 * Backend store stub configuration for tests
 */
export interface BackendStoreStubs {
  store: ReturnType<typeof useBackendStore>;
  generateCharacterNames: sinon.SinonStub;
  generateStoreNames: sinon.SinonStub;
  generateTavernNames: sinon.SinonStub;
  generateTownNames: sinon.SinonStub;
}

/**
 * Generate enough names to fill tables to TABLE_SIZE (100)
 */
const generateNames = (prefix: string, count: number = 100) => 
  Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);

/**
 * Creates stubbed backend store using the shared test Pinia instance.
 * Call this in beforeEach to set up the stubbed store.
 * 
 * @param options - Optional configuration for stub behavior
 * @returns Object containing the store instance and individual stubs
 */
export const createBackendStoreStubs = (options?: {
  npcNames?: string[];
  storeNames?: string[];
  tavernNames?: string[];
  townNames?: string[];
}): BackendStoreStubs => {
  // Use the shared test Pinia instance
  const pinia = getTestPinia();
  setActivePinia(pinia);
  
  // Get the backend store
  const store = useBackendStore();
  
  // Set available to true so backend checks pass
  store.available = true;
  
  // Create stubs for each generation method (use as any to bypass AxiosResponse type)
  const generateCharacterNames = sinon.stub(store, 'generateCharacterNames')
    .resolves({ data: { names: options?.npcNames ?? generateNames('Test NPC') } } as any);
  
  const generateStoreNames = sinon.stub(store, 'generateStoreNames')
    .resolves({ data: { names: options?.storeNames ?? generateNames('Test Store') } } as any);
  
  const generateTavernNames = sinon.stub(store, 'generateTavernNames')
    .resolves({ data: { names: options?.tavernNames ?? generateNames('Test Tavern') } } as any);
  
  const generateTownNames = sinon.stub(store, 'generateTownNames')
    .resolves({ data: { names: options?.townNames ?? generateNames('Test Town') } } as any);
  
  return {
    store,
    generateCharacterNames,
    generateStoreNames,
    generateTavernNames,
    generateTownNames,
  };
};

/**
 * Resets all stub call histories without changing their behavior
 * Call this before tests that check call counts
 */
export const resetBackendStoreStubHistory = (stubs: BackendStoreStubs): void => {
  stubs.generateCharacterNames.resetHistory();
  stubs.generateStoreNames.resetHistory();
  stubs.generateTavernNames.resetHistory();
  stubs.generateTownNames.resetHistory();
};
