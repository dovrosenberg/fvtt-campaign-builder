/**
 * Shared store stubbing utilities for unit tests
 * 
 * These utilities provide consistent stubbing of Pinia stores across all tests.
 * Import and use these in your test files to ensure tests don't interfere with
 * real settings or make actual API calls.
 * 
 * Usage:
 * ```typescript
 * import { createBackendStoreStubs, createMainStoreStubs, resetTestPinia } from '@unittest/stores';
 * 
 * beforeEach(async () => {
 *   backendStubs = createBackendStoreStubs();
 *   mainStoreStubs = createMainStoreStubs({ settings: [testSetting] });
 * });
 * 
 * afterEach(() => {
 *   sinon.restore();
 *   resetTestPinia();
 * });
 * ```
 */

export {
  createBackendStoreStubs,
  resetBackendStoreStubHistory,
  type BackendStoreStubs,
} from './backendStoreStubs';

export {
  createMainStoreStubs,
  setMockSettings,
  type MainStoreStubs,
} from './mainStoreStubs';

export {
  getTestPinia,
  resetTestPinia,
} from './testPinia';

export {
  createStoreStub,
  stubStoreComputed,
  type StoreStubResult,
  type StubConfig,
} from './createStoreStub';
