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
 * Stub a store property (including read-only computed properties) so it returns the given value.
 * Uses sinon getter stubs under the hood, so the stub is automatically restored by
 * `sandbox.restore()` or `sinon.restore()`.
 *
 * Returns the sinon stub so callers can change the return value later via `.get(() => newValue)`.
 *
 * @param sandbox - The sinon sandbox to register the stub in
 * @param store - The Pinia store instance
 * @param propName - The property name to stub
 * @param value - The value the property should return
 * @returns The sinon stub (with `.get()` applied)
 *
 * @example
 * ```typescript
 * const mainStore = useMainStore();
 * stubStoreComputed(sandbox, mainStore, 'currentTab', { header: { uuid: 'x' }, tabType: WindowTabType.Entry });
 * stubStoreComputed(sandbox, mainStore, 'currentSetting', {} as FCBSetting);
 * ```
 */
export function stubStoreComputed<T>(
  sandbox: sinon.SinonSandbox,
  store: T,
  propName: keyof T & string,
  value: unknown,
): sinon.SinonStub {
  return sandbox.stub(store as Record<string, unknown>, propName).get(() => value);
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
 * Automatically detects whether each config entry is a method or property:
 * - Functions (including SinonStubs) are treated as methods
 * - Non-function values are treated as properties and are intercepted via Proxy
 *
 * For stores with complex domain-specific defaults (e.g. backendStore's generateNames),
 * prefer the dedicated stub helpers in backendStoreStubs.ts / mainStoreStubs.ts.
 * Use this factory for simple cases or when adding stubs for new stores.
 *
 * @param useStore - The store composable (e.g. useNavigationStore)
 * @param config - Map of method names to stub values, or property names to override values
 * @returns The store instance and a map of applied stubs
 *
 * @example
 * ```typescript
 * const { store, stubs } = createStoreStub(useMainStore, {
 *   currentSetting: mockSetting,  // Property - auto-detected
 *   openContent: sinon.stub().resolves(),  // Method
 * });
 * ```
 */
export function createStoreStub<T>(
  useStore: () => T,
  config: Record<string, StubConfig> = {},
): StoreStubResult<T> {
  // Activate the shared test Pinia
  const pinia = getTestPinia();
  setActivePinia(pinia);

  const originalStore = useStore();
  const stubs: Record<string, sinon.SinonStub> = {};

  // Separate methods from properties
  const methodConfigs: Record<string, StubConfig> = {};
  const propertyConfigs: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    // Functions (including SinonStubs which have callCount) are methods
    if (typeof value === 'function') {
      methodConfigs[key] = value;
    } else {
      propertyConfigs[key] = value;
    }
  }

  // Apply method stubs - direct assignment works for methods on Pinia stores
  for (const [methodName, methodConfig] of Object.entries(methodConfigs)) {
    // Check if the config is already a SinonStub (duck-type by checking for callCount)
    if (methodConfig != null && typeof (methodConfig as sinon.SinonStub).callCount === 'number') {
      // Already a SinonStub — use it directly
      (originalStore as Record<string, unknown>)[methodName] = methodConfig;
      stubs[methodName] = methodConfig as sinon.SinonStub;
    } else {
      // Create a stub that resolves with the provided value
      const stub = sinon.stub().resolves(methodConfig);
      (originalStore as Record<string, unknown>)[methodName] = stub;
      stubs[methodName] = stub;
    }
  }

  // For property overrides, we can't modify the Pinia Proxy directly.
  // Instead, create a Proxy wrapper that intercepts property access.
  let store: T;
  if (Object.keys(propertyConfigs).length > 0) {
    store = new Proxy(originalStore, {
      get(target, prop) {
        // Check if this property has an override
        if (prop in propertyConfigs) {
          return propertyConfigs[prop as string];
        }
        // Otherwise, return from original store
        return (target as any)[prop];
      },
    }) as T;
  } else {
    store = originalStore;
  }

  return { store, stubs };
}
