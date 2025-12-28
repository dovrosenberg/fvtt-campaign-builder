<!--
StoryWebSettingsDialog: Configure Story Graph Settings

Purpose
- Provides a dialog for configuring colors and line styles for story graph connections, and element tooltip text.

Responsibilities
- Manage predefined colors and line styles for story web edges
- Allow users to add, edit, and delete color/style options
- Persist changes only when save button is clicked

Props
- None

Emits
- None

Slots
- None

Dependencies
- Stores: None
- Composables: None
- Services/API: ModuleSettings

-->

<template>
  <ConfigDialogLayout ref="contentRef">
    <template #header>
      <nav class="fcb-sheet-navigation flexrow tabs" data-group="sw-config-dialog">
        <a class="item" data-tab="colors">
          {{ localize('applications.storyWebSettings.tabs.colors') }}
        </a>
        <a class="item" data-tab="styles">
          {{ localize('applications.storyWebSettings.tabs.styles') }}
        </a>
        <a class="item" data-tab="fields">
          {{ localize('applications.storyWebSettings.tabs.fields') }}
        </a>
      </nav>
    </template>

    <template #scrollSection>
      <div class="fcb-tab-body flexrow">
        <!-- Colors Tab -->
        <div class="tab flexcol" data-group="sw-config-dialog" data-tab="colors">
          <DataTable
            :value="workingColors"
            data-key="uuid"
            size="small"
            :pt="{
              header: { style: 'border: none' },
              table: { style: 'margin: 0px; table-layout: fixed;' },
              thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
              row: {
                style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;',
              },
            }"
          >
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 0.5rem;">
                  <Button
                    unstyled
                    :label="localize('labels.add')"
                    style="flex: initial; width:auto;"
                    @click="onAddColor"
                  >
                    <template #icon>
                      <i class="fas fa-plus"></i>
                    </template>
                  </Button>
                </div>
              </div>
            </template>

            <template #empty>
              {{ localize('labels.noResults') }}
            </template>

            <Column field="actions" :header="localize('labels.tableHeaders.actions')" style="width: 100px">
              <template #body="{ data }">
                <a
                  class="fcb-action-icon"
                  :data-tooltip="localize('labels.delete')"
                  @click.stop="onDeleteColor(data.uuid)"
                >
                  <i class="fas fa-trash"></i>
                </a>
              </template>
            </Column>

            <Column field="name" :header="localize('applications.storyWebSettings.columns.name')" >
              <template #body="{ data }">
                <InputText v-model="data.name" unstyled style="width: 100%" />
              </template>
            </Column>

            <Column field="value" :header="localize('applications.storyWebSettings.columns.color')" >
              <template #body="{ data }">
                <FoundryColorPicker v-model="data.value" />
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Styles Tab -->
        <div class="tab flexcol" data-group="sw-config-dialog" data-tab="styles">
          <DataTable
            :value="workingStyles"
            data-key="uuid"
            size="small"
            :pt="{
              header: { style: 'border: none' },
              table: { style: 'margin: 0px; table-layout: fixed;' },
              thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
              row: {
                style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;',
              },
            }"
          >
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 0.5rem;">
                  <Button
                    unstyled
                    :label="localize('labels.add')"
                    style="flex: initial; width:auto;"
                    @click="onAddStyle"
                  >
                    <template #icon>
                      <i class="fas fa-plus"></i>
                    </template>
                  </Button>
                </div>
              </div>
            </template>

            <template #empty>
              {{ localize('labels.noResults') }}
            </template>

            <Column field="actions" :header="localize('labels.tableHeaders.actions')" style="width: 100px">
              <template #body="{ data }">
                <a
                  class="fcb-action-icon"
                  :data-tooltip="localize('labels.delete')"
                  @click.stop="onDeleteStyle(data.uuid)"
                >
                  <i class="fas fa-trash"></i>
                </a>
              </template>
            </Column>

            <Column field="name" :header="localize('applications.storyWebSettings.columns.name')" >
              <template #body="{ data }">
                <InputText v-model="data.name" unstyled style="width: 100%" />
              </template>
            </Column>

            <Column field="value" :header="localize('applications.storyWebSettings.columns.style')" >
              <template #body="{ data }">
                <Select
                  v-model="data.value"
                  :options="lineStyleOptions"
                  optionLabel="label"
                  optionValue="value"
                  style="width: 100%"
                />
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Fields Tab -->
        <div class="tab flexcol" data-group="sw-config-dialog" data-tab="fields">
          <div class="fields-header" style="padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <p class="hint" style="margin: 0; font-size: 0.9rem; color: var(--color-text-light);">
              {{ localize('applications.storyWebSettings.fieldsHint') }}
            </p>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label>{{ localize('applications.storyWebSettings.contentType') }}:</label>
              <Select
                v-model="selectedContentType"
                :options="contentTypeOptions"
                optionLabel="label"
                optionValue="value"
                style="width: 200px"
                @change="onContentTypeChange"
              />
            </div>
          </div>
          
          <DataTable
            :value="currentWorkingFields"
            dataKey="key"
            size="small"
            :rowReorder="true"
            @row-reorder="onFieldRowReorder"
            :pt="{
              header: { style: 'border: none' },
              table: { style: 'margin: 0px; table-layout: fixed;' },
              thead: { style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;' },
              row: {
                style: 'font-family: var(--font-primary); text-shadow: none; background: inherit;',
              },
            }"
          >
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="display: flex; gap: 0.5rem; align-items: center; flex: 1;">
                  <Select
                    v-model="selectedFieldToAdd"
                    :options="availableFields"
                    optionLabel="name"
                    optionValue="key"
                    :placeholder="localize('applications.storyWebSettings.selectField')"
                    style="flex: 1; min-width: 200px;"
                  />
                  <Button
                    unstyled
                    :label="localize('labels.add')"
                    style="flex: initial; width:auto;"
                    :disabled="!selectedFieldToAdd"
                    @click="onAddSelectedField"
                  >
                    <template #icon>
                      <i class="fas fa-plus"></i>
                    </template>
                  </Button>
                </div>
              </div>
            </template>

            <template #empty>
              {{ localize('labels.noResults') }}
            </template>

            <Column rowReorder style="width: 3rem" />

            <Column field="actions" :header="localize('labels.tableHeaders.actions')" style="width: 100px">
              <template #body="{ data }">
                <a
                  class="fcb-action-icon"
                  :data-tooltip="localize('labels.delete')"
                  @click.stop="onDeleteField(data.key)"
                >
                  <i class="fas fa-trash"></i>
                </a>
              </template>
            </Column>

            <Column field="name" :header="localize('applications.storyWebSettings.columns.fieldName')">
              <template #body="{ data }">
                <span>{{ data.name }}</span>
              </template>
            </Column>

          </DataTable>
        </div>
      </div>
    </template>

    <template #footer>
      <button @click="onResetClick">
        <i class="fa-solid fa-undo"></i>
        <label>{{ localize('labels.reset') }}</label>
      </button>
      <button class="fcb-save-button" @click="onSaveClick">
        <i class="fa-solid fa-save"></i>
        <label>{{ localize('labels.saveChanges') }}</label>
      </button>
    </template>
  </ConfigDialogLayout>
</template>

<script setup lang="ts">
  // library imports
  import { computed, ref, onMounted, nextTick } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { generateIdFromName } from '@/utils/idGeneration';
  import { storyWebSettingsApp } from '@/applications/settings/StoryWebSettingsApplication';
  import { useStoryWebStore } from '@/applications/stores';
  import { useMainStore } from '@/applications/stores';

  // library components
  import { Button, InputText, Select, DataTable, Column } from 'primevue';

  // local components
  import FoundryColorPicker from './FoundryColorPicker.vue';
  import ConfigDialogLayout from '@/components/layout/ConfigDialogLayout.vue';

  // types
  import { CustomFieldContentType, StoryWebNodeTypes } from '@/types';
  import { STORYWEB_TO_CUSTOM_FIELD_MAP } from '@/documents/fields/StoryWebNode';

  interface ColorOption {
    uuid: string;
    id: string;
    name: string;
    value: string;
  }

  interface StyleOption {
    uuid: string;
    id: string;
    name: string;
    value: string;
  }

  interface LineStyleOption {
    label: string;
    value: string;
  }

  interface PersistedColorOption {
    id: string;
    name: string;
    value: string;
  }

  interface PersistedStyleOption {
    id: string;
    name: string;
    value: string;
  }

  interface FieldOption {
    key: string;
    name: string;
  }

  // Helper type for the actual persisted data (can omit Custom type)
  type PersistedFieldsData = Partial<Record<StoryWebNodeTypes, string[]>>;

  interface ContentTypeOption {
    label: string;
    value: string;
    customFieldType: CustomFieldContentType | null;
  }

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const contentRef = ref<{ rootEl: HTMLElement | null } | null>(null);
  let tabs: foundry.applications.ux.Tabs | null = null;

  // Working copies that only persist when save is clicked
  const workingColors = ref<ColorOption[]>([]);
  const workingStyles = ref<StyleOption[]>([]);
  const workingFields = ref<Partial<Record<StoryWebNodeTypes, FieldOption[]>>>({});

  // Original values for reset functionality
  const originalColors = ref<ColorOption[]>([]);
  const originalStyles = ref<StyleOption[]>([]);
  const originalFields = ref<Partial<Record<StoryWebNodeTypes, FieldOption[]>>>({});

  // Current selected content type for fields tab
  const selectedContentType = ref<StoryWebNodeTypes>(StoryWebNodeTypes.Character);
  // Currently selected field to add from the dropdown
  const selectedFieldToAdd = ref<string | null>(null);

  // Content type options
  const contentTypeOptions: ContentTypeOption[] = [
    { label: 'Character', value: StoryWebNodeTypes.Character, customFieldType: STORYWEB_TO_CUSTOM_FIELD_MAP[StoryWebNodeTypes.Character] },
    { label: 'Location', value: StoryWebNodeTypes.Location, customFieldType: STORYWEB_TO_CUSTOM_FIELD_MAP[StoryWebNodeTypes.Location] },
    { label: 'Organization', value: StoryWebNodeTypes.Organization, customFieldType: STORYWEB_TO_CUSTOM_FIELD_MAP[StoryWebNodeTypes.Organization] },
    { label: 'PC', value: StoryWebNodeTypes.PC, customFieldType: STORYWEB_TO_CUSTOM_FIELD_MAP[StoryWebNodeTypes.PC] },
    { label: 'Danger', value: StoryWebNodeTypes.Danger, customFieldType: STORYWEB_TO_CUSTOM_FIELD_MAP[StoryWebNodeTypes.Danger] },
  ];

  // Hard-coded fields for each content type
  const hardcodedFields: Partial<Record<StoryWebNodeTypes, FieldOption[]>> = {
    [StoryWebNodeTypes.Character]: [
      { key: 'name', name: 'Name' },
      { key: 'type', name: 'Type' },
      { key: 'species', name: 'Species' },
      { key: 'description', name: 'Description' },
    ],
    [StoryWebNodeTypes.Location]: [
      { key: 'name', name: 'Name' },
      { key: 'type', name: 'Type' },
      { key: 'parent', name: 'Parent' },
      { key: 'description', name: 'Description' },
    ],
    [StoryWebNodeTypes.Organization]: [
      { key: 'name', name: 'Name' },
      { key: 'type', name: 'Type' },
      { key: 'parent', name: 'Parent' },
      { key: 'description', name: 'Description' },
    ],
    [StoryWebNodeTypes.PC]: [
      { key: 'name', name: 'Name' },
    ],
    [StoryWebNodeTypes.Danger]: [
      { key: 'name', name: 'Name' },
      { key: 'description', name: 'Description' },
      { key: 'impendingDoom', name: 'Impending Doom' },
      { key: 'motivation', name: 'Motivation' },
    ],
    // Custom nodes don't have configurable fields
  };

  // Line style options for the dropdown
  const lineStyleOptions = Object.entries(useStoryWebStore().LINE_STYLES).map(([key, value]) => ({
    label: value.name,
    value: key,
  })) as LineStyleOption[];
  
  ////////////////////////////////
  // computed data
  
  /**
   * Computed property for the current working fields based on selected content type
   */
  const currentWorkingFields = computed(() => {
    return workingFields.value[selectedContentType.value] || [];
  });
  
  /**
   * Computed property for the available fields that can be added
   */
  const availableFields = computed(() => {
    return getAvailableFieldsForContentType(selectedContentType.value);
  });

  ////////////////////////////////
  // methods
  /**
   * Get all available fields for a content type (hardcoded + custom)
   */
  const getAllFieldsForContentType = (contentType: StoryWebNodeTypes): FieldOption[] => {
    const fields = [...(hardcodedFields[contentType] || [])];

    const customContentType = contentTypeOptions.find(c => c.value === contentType)?.customFieldType;

    if (customContentType == null) {
      return fields;
    }

    // Add custom fields if available
    const customFields = ModuleSettings.get(SettingKey.customFields) as Record<string, any[]>;
    if (customFields && customFields[customContentType]) {
      customFields[customContentType].forEach((field: any) => {
        if (!fields.find(f => f.key === field.name)) {
          fields.push({
            key: field.name,
            name: field.label || field.name, // Use label for display name, fallback to name
          });
        }
      });
    }
    
    return fields.sort((a, b) => a.name.localeCompare(b.name));
  };

  /**
   * Load settings from module storage and initialize working copies
   */
  const loadSettings = () => {
    const persistedColors = ModuleSettings.get(SettingKey.storyWebConnectionColors) as PersistedColorOption[];
    const persistedStyles = ModuleSettings.get(SettingKey.storyWebConnectionStyles) as PersistedStyleOption[];
    const persistedFields = ModuleSettings.get(SettingKey.storyWebNodeFields) as PersistedFieldsData;
    
    originalColors.value = persistedColors.map(c => ({
      ...c,
      uuid: foundry.utils.randomID(),
    }));
    
    originalStyles.value = persistedStyles.map(s => ({
      ...s,
      uuid: foundry.utils.randomID(),
    }));

    // Initialize fields for each content type
    originalFields.value = {};
    Object.values(StoryWebNodeTypes).forEach(contentType => {
      // Skip Custom type as it doesn't have fields
      if (contentType === StoryWebNodeTypes.Custom) return;
      
      const selectedFieldKeys = persistedFields[contentType] || [];
      originalFields.value[contentType] = selectedFieldKeys.map(key => {
        const field = getAllFieldsForContentType(contentType).find(f => f.key === key);
        return field || { key, name: key };
      });
    });
    
    // Initialize working copies
    workingColors.value = JSON.parse(JSON.stringify(originalColors.value));
    workingStyles.value = JSON.parse(JSON.stringify(originalStyles.value));
    workingFields.value = JSON.parse(JSON.stringify(originalFields.value));
  };

  /**
   * Get available fields that can be added (not already selected)
   */
  const getAvailableFieldsForContentType = (contentType: StoryWebNodeTypes): FieldOption[] => {
    const allFields = getAllFieldsForContentType(contentType);
    const selectedFields = workingFields.value[contentType] || [];
    const selectedKeys = new Set(selectedFields.map(f => f.key));
    return allFields.filter(f => !selectedKeys.has(f.key));
  };


  /**
   * Reset working copies to their original saved values
   */
  const onResetClick = () => {
    // Reset working copies to original values
    workingColors.value = JSON.parse(JSON.stringify(originalColors.value));
    workingStyles.value = JSON.parse(JSON.stringify(originalStyles.value));
    workingFields.value = JSON.parse(JSON.stringify(originalFields.value));
  };

  ////////////////////////////////
  // event handlers
  /**
   * Validate and save the current working copies to module storage
   */
  const onSaveClick = async () => {
    // Validate that all IDs are unique
    const colorIds = new Set(workingColors.value.map(c => c.id));
    const styleIds = new Set(workingStyles.value.map(s => s.id));
    
    if (colorIds.size !== workingColors.value.length) {
      ui.notifications?.error(localize('applications.storyWebSettings.notifications.duplicateColorIds'));
      return;
    }
    
    if (styleIds.size !== workingStyles.value.length) {
      ui.notifications?.error(localize('applications.storyWebSettings.notifications.duplicateStyleIds'));
      return;
    }
    
    // Save to settings
    const persistedColors: PersistedColorOption[] = workingColors.value.map(c => ({
      id: c.id,
      name: c.name,
      value: c.value,
    }));
    
    const persistedStyles: PersistedStyleOption[] = workingStyles.value.map(s => ({
      id: s.id,
      name: s.name,
      value: s.value,
    }));

    const persistedFields: PersistedFieldsData = {};
    // Initialize all content types with empty arrays
    Object.values(StoryWebNodeTypes).forEach(contentType => {
      // Skip Custom type as it doesn't have fields
      if (contentType === StoryWebNodeTypes.Custom) return;
      
      persistedFields[contentType] = (workingFields.value[contentType] || []).map(f => f.key);
    });
    
    await ModuleSettings.set(SettingKey.storyWebConnectionColors, persistedColors);
    await ModuleSettings.set(SettingKey.storyWebConnectionStyles, persistedStyles);
    await ModuleSettings.set(SettingKey.storyWebNodeFields, persistedFields);
    
    // Update original values
    originalColors.value = JSON.parse(JSON.stringify(workingColors.value));
    originalStyles.value = JSON.parse(JSON.stringify(workingStyles.value));
    originalFields.value = JSON.parse(JSON.stringify(workingFields.value));
    
    ui.notifications?.info(localize('notifications.changesSaved'));
    
    // Refresh the current content to update tooltips
    await useMainStore().refreshCurrentContent();
    
    // Close the dialog
    await storyWebSettingsApp?.close();
  };

  /**
   * Add a new color to the working copies
   */
  const onAddColor = () => {
    const newColor: ColorOption = {
      uuid: foundry.utils.randomID(),
      id: generateIdFromName(`color-${workingColors.value.length + 1}`),
      name: `Color ${workingColors.value.length + 1}`,
      value: '#000000',
    };
    workingColors.value.push(newColor);
  };

  const onDeleteColor = (uuid: string) => {
    workingColors.value = workingColors.value.filter(c => c.uuid !== uuid);
  };

  const onAddStyle = () => {
    const newStyle: StyleOption = {
      uuid: foundry.utils.randomID(),
      id: generateIdFromName(`style-${workingStyles.value.length + 1}`),
      name: `Style ${workingStyles.value.length + 1}`,
      value: 'solid',
    };
    workingStyles.value.push(newStyle);
  };

  const onDeleteStyle = (uuid: string) => {
    workingStyles.value = workingStyles.value.filter(s => s.uuid !== uuid);
  };

    /**
   * Handle content type change
   */
  const onContentTypeChange = () => {
    // Reset the selected field when content type changes
    selectedFieldToAdd.value = null;
  };

  /**
   * Add the selected field from the dropdown
   */
  const onAddSelectedField = () => {
    if (!selectedFieldToAdd.value)
      return;
    
    const field = availableFields.value.find(f => f.key === selectedFieldToAdd.value);
    if (!field)
      return;
    
    if (!workingFields.value[selectedContentType.value]) {
      workingFields.value[selectedContentType.value] = [];
    }
    
    // TypeScript safety check - we know it's defined now
    const fieldsArray = workingFields.value[selectedContentType.value]!;
    fieldsArray.push(field);
    
    // Reset the selection
    selectedFieldToAdd.value = null;
  };

  /**
   * Delete a field from the selected content type
   */
  const onDeleteField = (key: string) => {
    const currentFields = workingFields.value[selectedContentType.value];
    if (!currentFields)
      return;
    
    workingFields.value[selectedContentType.value] = currentFields.filter(
      f => f.key !== key
    );
  };

  /**
   * Handle row reordering
   */
  const onFieldRowReorder = (event: any) => {
    if (!workingFields.value[selectedContentType.value])
      return;
    
    workingFields.value[selectedContentType.value] = event.value;
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle hooks
  onMounted(() => {
    loadSettings();
    
    // Initialize Foundry tabs
    nextTick(() => {
      const el = contentRef.value?.rootEl;
      
      if (el) {
        tabs = new foundry.applications.ux.Tabs({ 
          group: 'sw-config-dialog', 
          navSelector: '.tabs', 
          contentSelector: '.fcb-tab-body', 
          initial: 'colors',
          callback: () => {
            // No callback needed for now
          }
        });
        tabs.bind(el);
      }
    });
  });
</script>

<style lang="scss" scoped>
  .tab {
    display: none;
    height: 100%;
    flex-direction: column;
    min-height: 0;
  }

  .tab.active {
    display: flex;
  }

  .fcb-tab-body {
    display: flex;
    height: 100%;
  }
  

  .fcb-action-icon {
    cursor: pointer;
    color: var(--color-text-light-primary);
    padding: 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--color-bg-highlight);
    }
  }

  .fields-header {
    border-bottom: 1px solid var(--color-border-light);
    background: var(--color-bg-light);
  }
</style>

