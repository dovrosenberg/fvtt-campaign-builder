import * as sinon from 'sinon';
import { setActivePinia } from 'pinia';
import { getTestPinia } from './testPinia';

/**
 * Result of creating a store stub — the store instance plus a map of stubs by method name.
 */
export interface StoreStubResult<T> {
  store: T;
  stubs: Record<string, sinon.SinonStub>;
}

/**
 * Stub configuration for a single store method.
 * - If a SinonStub is provided, it is used directly.
 * - If any other value is provided, a stub that resolves/returns that value is created.
 */
export type StubConfig = sinon.SinonStub | unknown;

/**
 * Generic factory for creating stubbed Pinia stores in tests.
 * Uses the shared test Pinia instance so multiple stubbed stores can coexist.
 *
 * For stores with complex domain-specific defaults (e.g. backendStore's generateNames),
 * prefer the dedicated stub helpers in backendStoreStubs.ts / mainStoreStubs.ts.
 * Use this factory for simple cases or when adding stubs for new stores.
 *
 * @param useStore - The store composable (e.g. useNavigationStore)
 * @param methodStubs - Map of method names to stub values or SinonStub instances
 * @param propertyOverrides - Map of reactive property names to override values
 * @returns The store instance and a map of applied stubs
 *
 * @example
 * ```typescript
 * const { store, stubs } = createStoreStub(useNavigationStore, {
 *   openContent: sinon.stub().resolves(),
 *   propagateNameChange: sinon.stub().resolves(),
 * }, {
 *   focusedPanelIndex: 0,
 * });
 * ```
 */
export function createStoreStub<T>(
  useStore: () => T,
  methodStubs: Record<string, StubConfig> = {},
  propertyOverrides: Record<string, unknown> = {},
): StoreStubResult<T> {
  // Activate the shared test Pinia
  const pinia = getTestPinia();
  setActivePinia(pinia);

  const store = useStore();
  const stubs: Record<string, sinon.SinonStub> = {};

  // Apply method stubs
  for (const [methodName, config] of Object.entries(methodStubs)) {
    // Check if the config is already a SinonStub (duck-type by checking for callCount)
    if (config != null && typeof (config as sinon.SinonStub).callCount === 'number') {
      // Already a SinonStub — use it directly
      (store as Record<string, unknown>)[methodName] = config;
      stubs[methodName] = config as sinon.SinonStub;
    } else {
      // Create a stub that resolves with the provided value
      const stub = sinon.stub().resolves(config);
      (store as Record<string, unknown>)[methodName] = stub;
      stubs[methodName] = stub;
    }
  }

  // Apply property overrides
  for (const [propName, value] of Object.entries(propertyOverrides)) {
    (store as Record<string, unknown>)[propName] = value;
  }

  return { store, stubs };
}
