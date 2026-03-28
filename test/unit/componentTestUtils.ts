import type { ExpectStatic } from 'chai';
import * as sinon from 'sinon';
import { createStoreStub } from './stores/createStoreStub';
import { fakeFCBJournalEntryPageUuid } from './testUtils';
import type { TestWrapper } from './vueTestUtils';
import { flushPromises } from '@vue/test-utils';
import {
  useMainStore,
  useNavigationStore,
  useRelationshipStore,
  useSettingDirectoryStore,
  useCampaignDirectoryStore,
  useCampaignStore,
  useSessionStore,
  usePlayingStore,
  useFrontStore,
  useStoryWebStore,
  useArcStore,
} from '@/applications/stores';
import { FCBSetting, Entry, Campaign, Session, Arc, Front, StoryWeb } from '@/classes';
import { Topics } from '@/types';

/**
 * Component testing utilities to reduce boilerplate in Vue component tests.
 *
 * Provides helpers for:
 * - Emit assertions
 * - v-model testing
 * - Mock document creation
 * - Store stub presets
 * - Computed/watcher testing
 * - Input event simulation
 */

// ─── Emit Assertion Helpers ─────────────────────────────────────────────

/**
 * Assert that a component emitted an event with a specific payload.
 *
 * @param expect - The expect function from Quench batch context
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param eventName - The event name to check
 * @param callIndex - Which emission to check (default 0 for first)
 * @param expectedPayload - Expected payload value (optional, skips if undefined)
 *
 * @example
 * ```typescript
 * assertEmitted(expect, wrapper, 'update:modelValue', 0, 'new value');
 * assertEmitted(expect, wrapper, 'click'); // Just check event was emitted
 * ```
 */
export const assertEmitted = <T = any>(
  expect: ExpectStatic,
  wrapper: TestWrapper<any>,
  eventName: string,
  callIndex: number = 0,
  expectedPayload?: T,
): void => {
  const emissions = wrapper.emitted(eventName);
  if (!emissions) {
    throw new Error(`Expected '${eventName}' event to be emitted, but it was not`);
  }
  if (expectedPayload !== undefined) {
    expect(emissions[callIndex]).to.deep.equal([expectedPayload]);
  }
};

/**
 * Assert that a component did NOT emit an event.
 *
 * @param expect - The expect function from Quench batch context
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param eventName - The event name to check
 *
 * @example
 * ```typescript
 * assertNotEmitted(expect, wrapper, 'update:modelValue');
 * ```
 */
export const assertNotEmitted = (
  expect: ExpectStatic,
  wrapper: TestWrapper<any>,
  eventName: string,
): void => {
  expect(wrapper.emitted(eventName)).to.be.undefined;
};

/**
 * Get the payload from the nth emission of an event.
 *
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param eventName - The event name
 * @param callIndex - Which emission to get (default 0 for first)
 * @returns The payload value
 *
 * @example
 * ```typescript
 * const value = getEmitPayload<string>(wrapper, 'update:modelValue');
 * ```
 */
export const getEmitPayload = <T = any>(
  wrapper: TestWrapper<any>,
  eventName: string,
  callIndex: number = 0,
): T => {
  const emissions = wrapper.emitted(eventName);
  if (!emissions || !emissions[callIndex]) {
    throw new Error(`Event '${eventName}' was not emitted or call ${callIndex} does not exist`);
  }
  return emissions[callIndex][0] as T;
};

/**
 * Get all payloads from all emissions of an event.
 *
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param eventName - The event name
 * @returns Array of payloads
 *
 * @example
 * ```typescript
 * const values = getAllEmitPayloads<string>(wrapper, 'tagAdded');
 * expect(values).to.deep.equal(['tag1', 'tag2']);
 * ```
 */
export const getAllEmitPayloads = <T = any>(
  wrapper: TestWrapper<any>,
  eventName: string,
): T[] => {
  const emissions = wrapper.emitted(eventName);
  if (!emissions) {
    return [];
  }
  return emissions.map(e => e[0] as T);
};

// ─── v-model Testing Helpers ─────────────────────────────────────────────

/**
 * Test v-model binding by setting input value and checking emitted event.
 * Combines setValue, flushPromises, and emit assertion in one call.
 *
 * @param expect - The expect function from Quench batch context
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param inputValue - The value to set
 * @param inputSelector - CSS selector for input element (default 'input')
 *
 * @example
 * ```typescript
 * await testVModel(expect, wrapper, 'test value');
 * ```
 */
export const testVModel = async <T>(
  expect: ExpectStatic,
  wrapper: TestWrapper<any>,
  inputValue: T,
  inputSelector: string = 'input',
): Promise<void> => {
  const input = wrapper.find(inputSelector);
  await input.setValue(inputValue as any);
  await flushPromises();
  assertEmitted(expect, wrapper, 'update:modelValue', 0, inputValue);
};

/**
 * Test that v-model prop is rendered correctly in input.
 *
 * @param expect - The expect function from Quench batch context
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param expectedValue - The expected value
 * @param inputSelector - CSS selector for input element (default 'input')
 *
 * @example
 * ```typescript
 * testVModelRender(expect, wrapper, 'initial value');
 * ```
 */
export const testVModelRender = (
  expect: ExpectStatic,
  wrapper: TestWrapper<any>,
  expectedValue: any,
  inputSelector: string = 'input',
): void => {
  const input = wrapper.find(inputSelector);
  expect((input.element as HTMLInputElement).value).to.equal(String(expectedValue));
};

// ─── Mock Document Factories ─────────────────────────────────────────────

/**
 * Create a minimal mock FCBSetting for component tests.
 * Does NOT create a real Foundry document - just a plain object with needed properties.
 * Use for prop testing where full document functionality isn't needed.
 *
 * @param overrides - Properties to override defaults
 * @returns A mock FCBSetting object
 *
 * @example
 * ```typescript
 * const setting = createMockSetting({ name: 'My Setting' });
 * ```
 */
export const createMockSetting = (overrides: Partial<FCBSetting> = {}): FCBSetting => {
  return {
    uuid: fakeFCBJournalEntryPageUuid(),
    name: 'Test Setting',
    id: 'test-setting',
    topicFolders: {},
    hierarchies: {},
    tags: {},
    rollTableConfig: null,
    campaigns: {},
    campaignIndex: [],
    ...overrides,
  } as unknown as FCBSetting;
};

/**
 * Create a minimal mock Entry for component tests.
 *
 * @param overrides - Properties to override defaults
 * @returns A mock Entry object
 *
 * @example
 * ```typescript
 * const entry = createMockEntry({ name: 'John', topic: Topics.Character });
 * ```
 */
export const createMockEntry = (overrides: Partial<Entry> = {}): Entry => {
  return {
    uuid: fakeFCBJournalEntryPageUuid(),
    name: 'Test Entry',
    topic: Topics.Character,
    description: '',
    tags: [],
    actors: [],
    scenes: [],
    foundryDocuments: [],
    ...overrides,
  } as Entry;
};

/**
 * Create a minimal mock Campaign for component tests.
 *
 * @param overrides - Properties to override defaults
 * @returns A mock Campaign object
 */
export const createMockCampaign = (overrides: Partial<Campaign> = {}): Campaign => {
  return {
    uuid: fakeFCBJournalEntryPageUuid(),
    name: 'Test Campaign',
    description: '',
    sessions: [],
    arcs: [],
    storyWebs: [],
    completed: false,
    ...overrides,
  } as unknown as Campaign;
};

/**
 * Create a minimal mock Session for component tests.
 *
 * @param overrides - Properties to override defaults
 * @returns A mock Session object
 */
export const createMockSession = (overrides: Partial<Session> = {}): Session => {
  return {
    uuid: fakeFCBJournalEntryPageUuid(),
    name: 'Test Session',
    description: '',
    locations: {},
    npcs: {},
    storyWebs: [],
    ...overrides,
  } as Session;
};

/**
 * Create a minimal mock Arc for component tests.
 *
 * @param overrides - Properties to override defaults
 * @returns A mock Arc object
 */
export const createMockArc = (overrides: Partial<Arc> = {}): Arc => {
  return {
    uuid: fakeFCBJournalEntryPageUuid(),
    name: 'Test Arc',
    description: '',
    locations: {},
    participants: {},
    storyWebs: [],
    ...overrides,
  } as Arc;
};

/**
 * Create a minimal mock Front for component tests.
 *
 * @param overrides - Properties to override defaults
 * @returns A mock Front object
 */
export const createMockFront = (overrides: Partial<Front> = {}): Front => {
  return {
    uuid: fakeFCBJournalEntryPageUuid(),
    name: 'Test Front',
    description: '',
    ...overrides,
  } as Front;
};

/**
 * Create a minimal mock StoryWeb for component tests.
 *
 * @param overrides - Properties to override defaults
 * @returns A mock StoryWeb object
 */
export const createMockStoryWeb = (overrides: Partial<StoryWeb> = {}): StoryWeb => {
  return {
    uuid: fakeFCBJournalEntryPageUuid(),
    name: 'Test StoryWeb',
    description: '',
    ...overrides,
  } as unknown as StoryWeb;
};

// ─── Store Stub Presets ─────────────────────────────────────────────────

/**
 * Common store stub configuration for components that only need currentSetting.
 * Uses createStoreStub under the hood.
 *
 * @param setting - The setting to use (default: createMockSetting())
 * @returns Store stub result with store and stubs
 *
 * @example
 * ```typescript
 * const { store } = createMinimalMainStoreStub();
 * // or with custom setting
 * const { store } = createMinimalMainStoreStub(createMockSetting({ name: 'Custom' }));
 * ```
 */
export const createMinimalMainStoreStub = (setting: FCBSetting = createMockSetting()) => {
  return createStoreStub(useMainStore, {
    currentSetting: setting,
  });
};

/**
 * Store stub for components that navigate to content.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 *
 * @example
 * ```typescript
 * const { store, stubs } = createNavigationStoreStub();
 * await store.openContent('some-uuid');
 * expect(stubs.openContent.calledOnce).to.be.true;
 * ```
 */
export const createNavigationStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    useNavigationStore,
    {
      openContent: sinon.stub().resolves(),
      activateTab: sinon.stub().resolves(),
      closeTab: sinon.stub().resolves(),
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

/**
 * Store stub for relationship components.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 */
export const createRelationshipStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    useRelationshipStore,
    {
      addRelationship: sinon.stub().resolves(),
      removeRelationship: sinon.stub().resolves(),
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

/**
 * Store stub for setting directory components.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 */
export const createSettingDirectoryStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    useSettingDirectoryStore,
    {
      loadDirectory: sinon.stub().resolves(),
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

/**
 * Store stub for campaign directory components.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 */
export const createCampaignDirectoryStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    useCampaignDirectoryStore,
    {
      loadDirectory: sinon.stub().resolves(),
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

/**
 * Store stub for campaign components.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 */
export const createCampaignStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    useCampaignStore,
    {
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

/**
 * Store stub for session components.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 */
export const createSessionStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    useSessionStore,
    {
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

/**
 * Store stub for playing components.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 */
export const createPlayingStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    usePlayingStore,
    {
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

/**
 * Store stub for front components.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 */
export const createFrontStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    useFrontStore,
    {
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

/**
 * Store stub for story web components.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 */
export const createStoryWebStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    useStoryWebStore,
    {
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

/**
 * Store stub for arc components.
 *
 * @param overrides - Additional method/property overrides
 * @returns Store stub result
 */
export const createArcStoreStub = (overrides: {
  methods?: Record<string, any>;
  properties?: Record<string, any>;
} = {}) => {
  return createStoreStub(
    useArcStore,
    {
      ...overrides.methods,
    },
    {
      ...overrides.properties,
    },
  );
};

// ─── Computed Property Testing Helper ───────────────────────────────────

/**
 * Test a computed property with multiple input/output pairs.
 * Each test case sets props and checks the computed value.
 *
 * @param expect - The expect function from Quench batch context
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param computedName - Name of the computed property
 * @param testCases - Array of { props, expected } objects
 *
 * @example
 * ```typescript
 * testComputed(expect, wrapper, 'doubledCount', [
 *   { props: { count: 5 }, expected: 10 },
 *   { props: { count: 0 }, expected: 0 },
 *   { props: { count: -3 }, expected: -6 },
 * ]);
 * ```
 */
export const testComputed = async <T extends Record<string, any>, R>(
  expect: ExpectStatic,
  wrapper: TestWrapper<any>,
  computedName: string,
  testCases: Array<{ props: T; expected: R }>,
): Promise<void> => {
  for (const { props, expected } of testCases) {
    await wrapper.setProps(props);
    expect(wrapper.vm[computedName]).to.equal(expected);
  }
};

// ─── Watcher Testing Helper ──────────────────────────────────────────────

/**
 * Test that a watcher triggers a callback when a prop changes.
 *
 * @param expect - The expect function from Quench batch context
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param propName - Name of the prop to change
 * @param newValue - New value for the prop
 * @param callback - Callback to run after change (for assertions)
 *
 * @example
 * ```typescript
 * await testWatcher(expect, wrapper, 'count', 5, (w) => {
 *   expect(w.vm.doubledCount).to.equal(10);
 * });
 * ```
 */
export const testWatcher = async <T>(
  expect: ExpectStatic,
  wrapper: TestWrapper<any>,
  propName: string,
  newValue: T,
  callback: (expect: ExpectStatic, wrapper: TestWrapper<any>) => void | Promise<void>,
): Promise<void> => {
  await wrapper.setProps({ [propName]: newValue });
  await flushPromises();
  await callback(expect, wrapper);
};

// ─── Input Event Helpers ─────────────────────────────────────────────────

/**
 * Simulate user typing in an input field.
 * Sets value, triggers input event, and flushes promises.
 *
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param selector - CSS selector for input element
 * @param value - Value to type
 *
 * @example
 * ```typescript
 * await typeInInput(wrapper, 'input[name="title"]', 'New Title');
 * ```
 */
export const typeInInput = async (
  wrapper: TestWrapper<any>,
  selector: string,
  value: string,
): Promise<void> => {
  const input = wrapper.find(selector);
  await input.setValue(value);
  await input.trigger('input');
  await flushPromises();
};

/**
 * Simulate clicking a button.
 *
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param selector - CSS selector for button (default 'button')
 *
 * @example
 * ```typescript
 * await clickButton(wrapper, 'button.submit');
 * ```
 */
export const clickButton = async (
  wrapper: TestWrapper<any>,
  selector: string = 'button',
): Promise<void> => {
  await wrapper.find(selector).trigger('click');
  await flushPromises();
};

/**
 * Simulate selecting an option from a dropdown/select.
 *
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param selector - CSS selector for select element
 * @param value - Value to select
 *
 * @example
 * ```typescript
 * await selectOption(wrapper, 'select', 'option2');
 * ```
 */
export const selectOption = async (
  wrapper: TestWrapper<any>,
  selector: string,
  value: string,
): Promise<void> => {
  const select = wrapper.find(selector);
  await select.setValue(value);
  await select.trigger('change');
  await flushPromises();
};

/**
 * Simulate checking/unchecking a checkbox.
 *
 * @param wrapper - The Vue wrapper from mountComponent()
 * @param selector - CSS selector for checkbox
 * @param checked - Whether to check or uncheck
 *
 * @example
 * ```typescript
 * await toggleCheckbox(wrapper, 'input[type="checkbox"]', true);
 * ```
 */
export const toggleCheckbox = async (
  wrapper: TestWrapper<any>,
  selector: string,
  checked: boolean,
): Promise<void> => {
  const checkbox = wrapper.find(selector);
  await checkbox.setValue(checked);
  await checkbox.trigger('change');
  await flushPromises();
};

// Re-export flushPromises for convenience
export { flushPromises };
