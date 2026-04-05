import { mount, flushPromises, VueWrapper } from '@vue/test-utils';
import { setActivePinia, Pinia } from 'pinia';
import { Component, h, defineComponent, ComponentOptions } from 'vue';
import { QuenchBatchContext } from '@ethaks/fvtt-quench';
import { getTestPinia, resetTestPinia } from './stores/testPinia';
import { createStoreStub, StoreStubResult } from './stores/createStoreStub';
import * as sinon from 'sinon';
import {
  useMainStore,
  useNavigationStore,
  useSettingDirectoryStore,
  useCampaignDirectoryStore,
  useRelationshipStore,
  useCampaignStore,
  useSessionStore,
  usePlayingStore,
  useFrontStore,
  useStoryWebStore,
  useArcStore,
  useBackendStore,
} from '@/applications/stores';

/**
 * Vue component testing utilities for Quench tests in Foundry VTT.
 *
 * Design decisions:
 * - Store stubbing: Explicit opt-in (tests must specify which stores to stub)
 * - PrimeVue: Stubbed by default (we test logic, not UI)
 * - localize(): Stubbed to return the key itself (catches missing strings)
 * - DOM assertions: Minimal (only logic outcomes, not visual behavior)
 * - storeToRefs: Stubbed to work with stub stores (returns refs from stub values)
 */

// ─── Types ─────────────────────────────────────────────────────────────

/**
 * Store stub configuration for a specific store.
 */
export type StoreStubConfig<T> = {
  [K in keyof T]?: T[K] extends (...args: any[]) => any ? sinon.SinonStub | ReturnType<T[K]> : T[K];
};

/**
 * Options for mounting a Vue component in tests.
 */
export interface VueMountOptions {
  /** Props to pass to the component */
  props?: Record<string, any>;
  /** Slots content */
  slots?: Record<string, any>;
  /** Global configuration */
  global?: {
    /** Additional stubs beyond default PrimeVue stubs */
    stubs?: Record<string, any>;
    /** Provide/inject values */
    provide?: Record<string, any>;
    /** Use real PrimeVue components instead of stubs */
    useRealPrimeVue?: boolean;
  };
  /** Store stubs to apply (explicit opt-in) */
  stores?: {
    main?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useMainStore>>;
    navigation?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useNavigationStore>>;
    settingDirectory?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useSettingDirectoryStore>>;
    campaignDirectory?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useCampaignDirectoryStore>>;
    relationship?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useRelationshipStore>>;
    campaign?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useCampaignStore>>;
    session?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useSessionStore>>;
    playing?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').usePlayingStore>>;
    front?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useFrontStore>>;
    storyWeb?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useStoryWebStore>>;
    arc?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useArcStore>>;
    backend?: StoreStubConfig<ReturnType<typeof import('@/applications/stores').useBackendStore>>;
  };
  /** Attach to a specific DOM element */
  attachTo?: HTMLElement;
}

/**
 * Custom wrapper that provides emitted() tracking for browser environment.
 * Vue Test Utils' emitted() doesn't work when bundled for browser.
 */
export interface TestWrapper<T> {
  /** The underlying Vue wrapper */
  wrapper: VueWrapper<T>;
  /** Get all emissions of an event */
  emitted: (eventName: string) => any[][] | undefined;
  /** Check if wrapper exists */
  exists: () => boolean;
  /** Find an element */
  find: (selector: string) => { element: Element | undefined; exists: () => boolean; setValue: (value: any) => Promise<void>; trigger: (event: string, options?: Record<string, any>) => Promise<void>; classes: () => string[]; attributes: (name?: string) => Record<string, string> | string | undefined };
  /** Set props */
  setProps: (props: Record<string, any>) => Promise<void>;
  /** Access component VM */
  vm: T;
  /** Unmount the component */
  unmount: () => void;
  /** Get element text */
  text: () => string;
}

/**
 * Event emissions storage.
 */
interface EmissionStore {
  [eventName: string]: any[][];
}

/**
 * Result of mounting a component for testing.
 */
export interface MountedComponent<T> {
  /** The wrapped component for assertions */
  wrapper: TestWrapper<T>;
  /** Store stubs that were created (keyed by store name) */
  storeStubs: Record<string, StoreStubResult<any>>;
  /** The DOM container element */
  container: HTMLElement | null;
}

// ─── PrimeVue Stubs ─────────────────────────────────────────────────────

/**
 * Default stubs for common PrimeVue components.
 * These are used when useRealPrimeVue is false (the default).
 */
const primeVueStubs: Record<string, any> = {
  Button: defineComponent({
    name: 'ButtonStub',
    props: ['label', 'icon', 'severity', 'size', 'disabled', 'loading', 'outlined', 'text', 'badge', 'ariaLabel'],
    template: '<button class="p-button" :disabled="disabled">{{ label }}<slot /></button>',
  }),
  InputText: defineComponent({
    name: 'InputTextStub',
    props: ['modelValue', 'placeholder', 'disabled', 'type'],
    emits: ['update:modelValue'],
    template: '<input class="p-inputtext" :value="modelValue" :placeholder="placeholder" :disabled="disabled" :type="type || \'text\'" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
  InputNumber: defineComponent({
    name: 'InputNumberStub',
    props: ['modelValue', 'min', 'max', 'step', 'disabled', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<input type="number" class="p-inputnumber" :value="modelValue" :min="min" :max="max" :step="step" :disabled="disabled" :placeholder="placeholder" @input="$emit(\'update:modelValue\', parseFloat($event.target.value))" />',
  }),
  Dropdown: defineComponent({
    name: 'DropdownStub',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template: '<select class="p-dropdown" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="opt in options" :key="opt" :value="optionValue ? opt[optionValue] : opt" :selected="modelValue === (optionValue ? opt[optionValue] : opt)">{{ optionLabel ? opt[optionLabel] : opt }}</option></select>',
  }),
  Select: defineComponent({
    name: 'SelectStub',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template: '<select class="p-select" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="opt in options" :key="opt" :value="optionValue ? opt[optionValue] : opt" :selected="modelValue === (optionValue ? opt[optionValue] : opt)">{{ optionLabel ? opt[optionLabel] : opt }}</option></select>',
  }),
  MultiSelect: defineComponent({
    name: 'MultiSelectStub',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder', 'disabled', 'maxSelectedLabels'],
    emits: ['update:modelValue'],
    template: '<div class="p-multiselect">{{ modelValue?.length || 0 }} selected</div>',
  }),
  Checkbox: defineComponent({
    name: 'CheckboxStub',
    props: ['modelValue', 'binary', 'disabled', 'value'],
    emits: ['update:modelValue', 'change'],
    template: '<input type="checkbox" class="p-checkbox" :checked="binary ? modelValue : (Array.isArray(modelValue) && modelValue.includes(value))" :disabled="disabled" @change="$emit(\'update:modelValue\', binary ? $event.target.checked : toggleArrayValue($event))" />',
    methods: {
      toggleArrayValue(event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        const current = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
        if (checked && !current.includes(this.value)) {
          current.push(this.value);
        } else if (!checked) {
          const idx = current.indexOf(this.value);
          if (idx > -1) current.splice(idx, 1);
        }
        return current;
      },
    },
  }),
  RadioButton: defineComponent({
    name: 'RadioButtonStub',
    props: ['modelValue', 'value', 'disabled', 'name'],
    emits: ['update:modelValue', 'change'],
    template: '<input type="radio" class="p-radiobutton" :name="name" :value="value" :checked="modelValue === value" :disabled="disabled" @change="$emit(\'update:modelValue\', value)" />',
  }),
  ToggleSwitch: defineComponent({
    name: 'ToggleSwitchStub',
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template: '<input type="checkbox" class="p-toggleswitch" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  }),
  InputSwitch: defineComponent({
    name: 'InputSwitchStub',
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template: '<input type="checkbox" class="p-inputswitch" :checked="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
  }),
  Textarea: defineComponent({
    name: 'TextareaStub',
    props: ['modelValue', 'placeholder', 'disabled', 'rows', 'cols'],
    emits: ['update:modelValue'],
    template: '<textarea class="p-textarea" :placeholder="placeholder" :disabled="disabled" :rows="rows" :cols="cols" @input="$emit(\'update:modelValue\', $event.target.value)">{{ modelValue }}</textarea>',
  }),
  Dialog: defineComponent({
    name: 'DialogStub',
    props: ['visible', 'header', 'modal', 'closable', 'style', 'breakpoints'],
    emits: ['update:visible', 'hide', 'show'],
    template: '<div v-if="visible" class="p-dialog"><div class="p-dialog-header" v-if="header">{{ header }}</div><div class="p-dialog-content"><slot /></div></div>',
  }),
  Tooltip: defineComponent({
    name: 'TooltipStub',
    template: '<span class="p-tooltip"><slot /></span>',
  }),
  TabView: defineComponent({
    name: 'TabViewStub',
    props: ['activeIndex'],
    emits: ['update:activeIndex'],
    template: '<div class="p-tabview"><slot /></div>',
  }),
  Tabs: defineComponent({
    name: 'TabsStub',
    props: ['value'],
    emits: ['update:value'],
    template: '<div class="p-tabs"><slot /></div>',
  }),
  TabList: defineComponent({
    name: 'TabListStub',
    template: '<div class="p-tablist"><slot /></div>',
  }),
  Tab: defineComponent({
    name: 'TabStub',
    props: ['value'],
    template: '<div class="p-tab"><slot /></div>',
  }),
  TabPanels: defineComponent({
    name: 'TabPanelsStub',
    props: ['value'],
    template: '<div class="p-tabpanels"><slot /></div>',
  }),
  TabPanel: defineComponent({
    name: 'TabPanelStub',
    props: ['value', 'header'],
    template: '<div class="p-tabpanel"><slot /></div>',
  }),
  FloatLabel: defineComponent({
    name: 'FloatLabelStub',
    template: '<span class="p-floatlabel"><slot /></span>',
  }),
  IconField: defineComponent({
    name: 'IconFieldStub',
    template: '<span class="p-iconfield"><slot /></span>',
  }),
  InputIcon: defineComponent({
    name: 'InputIconStub',
    template: '<i class="p-inputicon"><slot /></i>',
  }),
  ButtonGroup: defineComponent({
    name: 'ButtonGroupStub',
    template: '<span class="p-buttongroup"><slot /></span>',
  }),
  SplitButton: defineComponent({
    name: 'SplitButtonStub',
    props: ['label', 'model', 'disabled'],
    template: '<div class="p-splitbutton"><button class="p-button">{{ label }}</button><slot /></div>',
  }),
  Menu: defineComponent({
    name: 'MenuStub',
    props: ['model', 'popup'],
    template: '<ul class="p-menu"><li v-for="item in model" :key="item.label">{{ item.label }}</li></ul>',
  }),
  ConfirmDialog: defineComponent({
    name: 'ConfirmDialogStub',
    template: '<div class="p-confirmdialog"><slot /></div>',
  }),
  ProgressSpinner: defineComponent({
    name: 'ProgressSpinnerStub',
    template: '<div class="p-progressspinner"></div>',
  }),
  Skeleton: defineComponent({
    name: 'SkeletonStub',
    props: ['width', 'height', 'borderRadius'],
    template: '<div class="p-skeleton" :style="{ width, height, borderRadius }"></div>',
  }),
  Chip: defineComponent({
    name: 'ChipStub',
    props: ['label', 'removable'],
    emits: ['remove'],
    template: '<span class="p-chip">{{ label }}<button v-if="removable" @click="$emit(\'remove\')">×</button></span>',
  }),
  Tag: defineComponent({
    name: 'TagStub',
    props: ['value', 'severity', 'rounded'],
    template: '<span class="p-tag" :class="severity">{{ value }}<slot /></span>',
  }),
  Badge: defineComponent({
    name: 'BadgeStub',
    props: ['value', 'severity', 'size'],
    template: '<span class="p-badge" :class="severity">{{ value }}</span>',
  }),
  Divider: defineComponent({
    name: 'DividerStub',
    props: ['align', 'layout', 'type'],
    template: '<hr class="p-divider" />',
  }),
  Panel: defineComponent({
    name: 'PanelStub',
    props: ['header', 'toggleable', 'collapsed'],
    emits: ['toggle'],
    template: '<div class="p-panel"><div class="p-panel-header">{{ header }}</div><div class="p-panel-content" v-if="!collapsed"><slot /></div></div>',
  }),
  Fieldset: defineComponent({
    name: 'FieldsetStub',
    props: ['legend', 'toggleable', 'collapsed'],
    emits: ['toggle'],
    template: '<fieldset class="p-fieldset"><legend v-if="legend">{{ legend }}</legend><div v-if="!collapsed"><slot /></div></fieldset>',
  }),
  Accordion: defineComponent({
    name: 'AccordionStub',
    props: ['value', 'multiple'],
    emits: ['update:value'],
    template: '<div class="p-accordion"><slot /></div>',
  }),
  AccordionPanel: defineComponent({
    name: 'AccordionPanelStub',
    props: ['value'],
    template: '<div class="p-accordionpanel"><slot /></div>',
  }),
  AccordionHeader: defineComponent({
    name: 'AccordionHeaderStub',
    template: '<div class="p-accordionheader"><slot /></div>',
  }),
  AccordionContent: defineComponent({
    name: 'AccordionContentStub',
    template: '<div class="p-accordioncontent"><slot /></div>',
  }),
  Listbox: defineComponent({
    name: 'ListboxStub',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'multiple', 'disabled'],
    emits: ['update:modelValue'],
    template: '<div class="p-listbox"><slot /></div>',
  }),
  Calendar: defineComponent({
    name: 'CalendarStub',
    props: ['modelValue', 'dateFormat', 'showTime', 'timeOnly', 'disabled', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<input type="date" class="p-calendar" :disabled="disabled" :placeholder="placeholder" />',
  }),
  DatePicker: defineComponent({
    name: 'DatePickerStub',
    props: ['modelValue', 'dateFormat', 'showTime', 'timeOnly', 'disabled', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<input type="date" class="p-datepicker" :disabled="disabled" :placeholder="placeholder" />',
  }),
  ColorPicker: defineComponent({
    name: 'ColorPickerStub',
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template: '<input type="color" class="p-colorpicker" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
  Slider: defineComponent({
    name: 'SliderStub',
    props: ['modelValue', 'min', 'max', 'step', 'disabled'],
    emits: ['update:modelValue'],
    template: '<input type="range" class="p-slider" :value="modelValue" :min="min" :max="max" :step="step" :disabled="disabled" @input="$emit(\'update:modelValue\', parseFloat($event.target.value))" />',
  }),
  Rating: defineComponent({
    name: 'RatingStub',
    props: ['modelValue', 'stars', 'disabled', 'readonly'],
    emits: ['update:modelValue'],
    template: '<div class="p-rating">{{ modelValue }} / {{ stars }}</div>',
  }),
  FileUpload: defineComponent({
    name: 'FileUploadStub',
    props: ['mode', 'accept', 'multiple', 'disabled', 'customUpload'],
    emits: ['select', 'upload', 'error'],
    template: '<div class="p-fileupload"><slot /></div>',
  }),
  Image: defineComponent({
    name: 'ImageStub',
    props: ['src', 'alt', 'width', 'height', 'preview'],
    template: '<img class="p-image" :src="src" :alt="alt" :width="width" :height="height" />',
  }),
  Avatar: defineComponent({
    name: 'AvatarStub',
    props: ['image', 'label', 'icon', 'shape', 'size'],
    template: '<div class="p-avatar">{{ label }}<img v-if="image" :src="image" /></div>',
  }),
  OverlayPanel: defineComponent({
    name: 'OverlayPanelStub',
    props: ['visible'],
    emits: ['update:visible', 'hide', 'show'],
    template: '<div v-if="visible" class="p-overlaypanel"><slot /></div>',
  }),
  Popover: defineComponent({
    name: 'PopoverStub',
    template: '<div class="p-popover"><slot /></div>',
  }),
  Message: defineComponent({
    name: 'MessageStub',
    props: ['severity', 'closable'],
    template: '<div class="p-message" :class="severity"><slot /></div>',
  }),
  InlineMessage: defineComponent({
    name: 'InlineMessageStub',
    props: ['severity'],
    template: '<span class="p-inlinemessage" :class="severity"><slot /></span>',
  }),
  Toast: defineComponent({
    name: 'ToastStub',
    template: '<div class="p-toast"></div>',
  }),
  SelectButton: defineComponent({
    name: 'SelectButtonStub',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'multiple', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template: '<div class="p-selectbutton"><slot /></div>',
  }),
  InputMask: defineComponent({
    name: 'InputMaskStub',
    props: ['modelValue', 'mask', 'placeholder', 'disabled'],
    emits: ['update:modelValue'],
    template: '<input class="p-inputmask" :value="modelValue" :placeholder="placeholder" :disabled="disabled" />',
  }),
  InputOtp: defineComponent({
    name: 'InputOtpStub',
    props: ['modelValue', 'length', 'disabled'],
    emits: ['update:modelValue'],
    template: '<div class="p-inputotp"><slot /></div>',
  }),
  AutoComplete: defineComponent({
    name: 'AutoCompleteStub',
    props: ['modelValue', 'suggestions', 'optionLabel', 'multiple', 'disabled', 'placeholder'],
    emits: ['update:modelValue', 'complete', 'item-select'],
    template: '<input class="p-autocomplete" :value="modelValue" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  }),
  CascadeSelect: defineComponent({
    name: 'CascadeSelectStub',
    props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder', 'disabled'],
    emits: ['update:modelValue', 'change'],
    template: '<select class="p-cascadeselect" :disabled="disabled"><slot /></select>',
  }),
  TreeSelect: defineComponent({
    name: 'TreeSelectStub',
    props: ['modelValue', 'options', 'placeholder', 'disabled', 'selectionMode'],
    emits: ['update:modelValue', 'node-select', 'node-unselect'],
    template: '<div class="p-treeselect">{{ modelValue }}<slot /></div>',
  }),
  Tree: defineComponent({
    name: 'TreeStub',
    props: ['value', 'selectionMode', 'selectionKeys'],
    emits: ['update:selectionKeys', 'node-select', 'node-expand', 'node-collapse'],
    template: '<div class="p-tree"><slot /></div>',
  }),
  DataTable: defineComponent({
    name: 'DataTableStub',
    props: ['value', 'dataKey', 'rows', 'paginator', 'selection', 'selectionMode'],
    emits: ['update:selection', 'row-select', 'row-click'],
    template: '<table class="p-datatable"><slot /></table>',
  }),
  Column: defineComponent({
    name: 'ColumnStub',
    props: ['field', 'header', 'sortable'],
    template: '<td class="p-column"><slot /></td>',
  }),
  VirtualScroller: defineComponent({
    name: 'VirtualScrollerStub',
    props: ['items', 'itemSize'],
    template: '<div class="p-virtualscroller"><slot /></div>',
  }),
};

// ─── Localize Stub ───────────────────────────────────────────────────────

/**
 * Stub for the localize function that returns the key itself.
 * This makes tests simpler and catches missing/unlocalized strings.
 *
 * @param key - The i18n key
 * @returns The key itself
 */
export const stubLocalize = (key: string): string => key;

// ─── Mount Component ─────────────────────────────────────────────────────

/**
 * Mount a Vue component for testing with automatic setup.
 *
 * Features:
 * - Stubbed localize() (returns key)
 * - Stubbed PrimeVue components (unless useRealPrimeVue=true)
 * - Optional store stubs (explicit opt-in)
 * - Automatic Pinia setup
 * - DOM container management
 *
 * @param component - The Vue component to mount
 * @param options - Mount options
 * @returns The mounted component wrapper and metadata
 *
 * @example
 * ```typescript
 * const { wrapper } = mountComponent(MyComponent, {
 *   props: { title: 'Hello' }
 * });
 * expect(wrapper.text()).to.include('Hello');
 * ```
 *
 * @example With store stubs
 * ```typescript
 * const { wrapper, storeStubs } = mountComponent(MyComponent, {
 *   props: { title: 'Hello' },
 *   stores: {
 *     main: { currentSetting: mockSetting }
 *   }
 * });
 * ```
 */
export function mountComponent<T extends Component>(
  component: T,
  options: VueMountOptions = {},
): MountedComponent<T> {
  // Set up Pinia
  const pinia = getTestPinia();
  setActivePinia(pinia);

  // Create container if needed
  let container: HTMLElement | null = null;
  if (!options.attachTo) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  // Build stubs
  const stubs: Record<string, any> = {
    ...(!options.global?.useRealPrimeVue ? primeVueStubs : {}),
    ...options.global?.stubs,
  };

  // Set up store stubs if provided
  const storeStubs: Record<string, StoreStubResult<any>> = {};
  
  if (options.stores) {
    if (options.stores.main) {
      storeStubs.main = createStoreStub(useMainStore, options.stores.main as Record<string, any>);
    }
    if (options.stores.navigation) {
      storeStubs.navigation = createStoreStub(useNavigationStore, options.stores.navigation as Record<string, any>);
    }
    if (options.stores.settingDirectory) {
      storeStubs.settingDirectory = createStoreStub(useSettingDirectoryStore, options.stores.settingDirectory as Record<string, any>);
    }
    if (options.stores.campaignDirectory) {
      storeStubs.campaignDirectory = createStoreStub(useCampaignDirectoryStore, options.stores.campaignDirectory as Record<string, any>);
    }
    if (options.stores.relationship) {
      storeStubs.relationship = createStoreStub(useRelationshipStore, options.stores.relationship as Record<string, any>);
    }
    if (options.stores.campaign) {
      storeStubs.campaign = createStoreStub(useCampaignStore, options.stores.campaign as Record<string, any>);
    }
    if (options.stores.session) {
      storeStubs.session = createStoreStub(useSessionStore, options.stores.session as Record<string, any>);
    }
    if (options.stores.playing) {
      storeStubs.playing = createStoreStub(usePlayingStore, options.stores.playing as Record<string, any>);
    }
    if (options.stores.front) {
      storeStubs.front = createStoreStub(useFrontStore, options.stores.front as Record<string, any>);
    }
    if (options.stores.storyWeb) {
      storeStubs.storyWeb = createStoreStub(useStoryWebStore, options.stores.storyWeb as Record<string, any>);
    }
    if (options.stores.arc) {
      storeStubs.arc = createStoreStub(useArcStore, options.stores.arc as Record<string, any>);
    }
    if (options.stores.backend) {
      storeStubs.backend = createStoreStub(useBackendStore, options.stores.backend as Record<string, any>);
    }
  }

  // Mount the component directly
  const vueWrapper = mount(component as ComponentOptions, {
    props: options.props,
    slots: options.slots,
    attachTo: options.attachTo || container || undefined,
    global: {
      plugins: [pinia],
      stubs,
      provide: options.global?.provide,
    },
  });

  // Create custom wrapper that uses Vue Test Utils' native emitted() tracking
  const wrapper: TestWrapper<T> = {
    wrapper: vueWrapper as unknown as VueWrapper<T>,
    emitted: (eventName: string) => {
      // Vue Test Utils stores emits as arrays of argument arrays
      // e.g., { 'update:modelValue': [['value1'], ['value2']] }
      const allEmits = vueWrapper.emitted();
      return allEmits[eventName] as any[][] | undefined;
    },
    exists: () => vueWrapper.exists(),
    find: (selector: string) => {
      const el = vueWrapper.find(selector);
      const exists = el.exists();
      return {
        element: exists ? el.element : undefined,
        exists: () => exists,
        setValue: async (value: any) => { await el.setValue(value); },
        trigger: async (event: string, options?: Record<string, any>) => { await el.trigger(event, options); },
        classes: () => exists ? Array.from(el.element.classList) : [],
        attributes: (name?: string) => {
          if (!exists) return name ? undefined : {};
          const attrs: Record<string, string> = {};
          for (const attr of Array.from(el.element.attributes)) {
            attrs[attr.name] = attr.value;
          }
          return name ? attrs[name] : attrs;
        },
      };
    },
    setProps: async (props: Record<string, any>) => { await vueWrapper.setProps(props); },
    // Return component instance (includes defineExpose properties)
    vm: vueWrapper.vm as T,
    unmount: () => vueWrapper.unmount(),
    text: () => vueWrapper.text(),
  };

  return { wrapper, storeStubs, container };
}

/**
 * Unmount a component and clean up its container.
 *
 * @param mounted - The mounted component result from mountComponent
 */
export function unmountComponent(mounted: MountedComponent<any>): void {
  mounted.wrapper.unmount();
  if (mounted.container) {
    mounted.container.remove();
  }
}

// ─── Vue Batch Creation ───────────────────────────────────────────────────

/**
 * Creates a Quench test batch for Vue component tests with automatic setup.
 *
 * Features:
 * - Creates DOM container in before()
 * - Stubs game.i18n.localize to return the key (catches missing strings)
 * - Cleans up wrapper in afterEach()
 * - Removes container in after()
 * - Resets test Pinia in after()
 *
 * @param batchName - Quench batch ID (e.g. 'campaign-builder.components.LabelWithHelp')
 * @param displayName - Path shown in the Quench UI (e.g. '/components/LabelWithHelp')
 * @param registerTests - Function that registers the test's describe/it blocks
 *
 * @example
 * ```typescript
 * // In test/unit/components/index.ts
 * import { createVueBatch } from '@unittest/vueTestUtils';
 * import { registerLabelWithHelpTests } from './LabelWithHelp.test';
 *
 * export const registerLabelWithHelpBatch = () => {
 *   createVueBatch(
 *     'campaign-builder.components.LabelWithHelp',
 *     '/components/LabelWithHelp',
 *     registerLabelWithHelpTests
 *   );
 * };
 * ```
 */
export function createVueBatch(
  batchName: string,
  displayName: string,
  registerTests: (context: VueTestContext) => void,
): void {
  quench?.registerBatch(
    `campaign-builder.${batchName}`,
    (context: QuenchBatchContext) => {
      const { before, after, afterEach } = context;

      // Shared container for this batch
      let container: HTMLElement;
      let currentWrapper: VueWrapper<any> | null = null;
      let originalLocalize: ((key: string) => string) | null = null;

      before(() => {
        container = document.createElement('div');
        container.id = `test-container-${batchName.replace(/\./g, '-')}`;
        document.body.appendChild(container);

        // Stub game.i18n.localize to return the key itself
        // This catches missing/unlocalized strings during tests
        if (game?.i18n?.localize) {
          originalLocalize = game.i18n.localize.bind(game.i18n);
          game.i18n.localize = (key: string) => key;
        }
      });

      afterEach(() => {
        if (currentWrapper) {
          currentWrapper.unmount();
          currentWrapper = null;
        }
        // Clear container content between tests
        container.innerHTML = '';
        sinon.restore();
      });

      after(() => {
        container?.remove();
        resetTestPinia();

        // Restore original localize function
        if (originalLocalize && game?.i18n) {
          game.i18n.localize = originalLocalize;
        }
      });

      // Create enhanced context with Vue helpers
      const vueContext: VueTestContext = {
        ...context,
        getContainer: () => container,
        setCurrentWrapper: (wrapper) => { currentWrapper = wrapper; },
      };

      registerTests(vueContext);
    },
    { displayName: `World & Campaign Builder: ${displayName}`, preSelected: false },
  );
}

/**
 * Enhanced Quench context with Vue-specific helpers.
 */
export interface VueTestContext extends QuenchBatchContext {
  /** Get the shared DOM container for this batch */
  getContainer: () => HTMLElement;
  /** Set the current wrapper (called by test utilities for cleanup) */
  setCurrentWrapper: (wrapper: VueWrapper<any> | null) => void;
}

// Re-export flushPromises for async testing
export { flushPromises };
