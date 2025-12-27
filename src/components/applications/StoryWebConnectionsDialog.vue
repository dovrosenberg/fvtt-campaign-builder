<!--
StoryWebConnectionsDialog: Configure Story Graph Connections

Purpose
- Provides a dialog for configuring colors and line styles for story graph connections.

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
      <nav class="fcb-sheet-navigation flexrow tabs" data-group="connections-dialog">
        <a class="item" data-tab="colors">
          {{ localize('applications.storyWebConnections.tabs.colors') }}
        </a>
        <a class="item" data-tab="styles">
          {{ localize('applications.storyWebConnections.tabs.styles') }}
        </a>
      </nav>
    </template>

    <template #scrollSection>
      <div class="fcb-tab-body flexrow">
        <!-- Colors Tab -->
        <div class="tab flexcol" data-group="connections-dialog" data-tab="colors">
          <DataTable
            :value="workingColors"
            data-key="uuid"
            size="small"
            scrollable
            scroll-height="flex"
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

            <Column field="actions" :header="localize('labels.tableHeaders.actions')" style="width: 4rem">
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

            <Column field="name" :header="localize('applications.storyWebConnections.columns.name')" style="width: 40%">
              <template #body="{ data }">
                <InputText v-model="data.name" unstyled style="width: 100%" />
              </template>
            </Column>

            <Column field="value" :header="localize('applications.storyWebConnections.columns.color')" style="width: 40%">
              <template #body="{ data }">
                <FoundryColorPicker v-model="data.value" />
              </template>
            </Column>
          </DataTable>
        </div>

        <!-- Styles Tab -->
        <div class="tab flexcol" data-group="connections-dialog" data-tab="styles">
          <DataTable
            :value="workingStyles"
            data-key="uuid"
            size="small"
            scrollable
            scroll-height="flex"
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

            <Column field="actions" :header="localize('labels.tableHeaders.actions')" style="width: 4rem">
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

            <Column field="name" :header="localize('applications.storyWebConnections.columns.name')" style="width: 40%">
              <template #body="{ data }">
                <InputText v-model="data.name" unstyled style="width: 100%" />
              </template>
            </Column>

            <Column field="value" :header="localize('applications.storyWebConnections.columns.style')" style="width: 40%">
              <template #body="{ data }">
                <Select
                  v-model="data.value"
                  :options="lineStyleOptions"
                  optionLabel="label"
                  optionValue="value"
                  unstyled
                  style="width: 100%"
                />
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
  import { ref, onMounted, nextTick } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { generateIdFromName } from '@/utils/idGeneration';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
  import { Button, InputText, Select, DataTable, Column } from 'primevue';

  // local components
  import FoundryColorPicker from './FoundryColorPicker.vue';
  import ConfigDialogLayout from '@/components/layout/ConfigDialogLayout.vue';

  // types
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

  // Original values for reset functionality
  const originalColors = ref<ColorOption[]>([]);
  const originalStyles = ref<StyleOption[]>([]);

  // Line style options for the dropdown
  const lineStyleOptions: LineStyleOption[] = [
    { label: 'Solid', value: 'solid' },
    { label: 'Dashed', value: 'dashed' },
    { label: 'Dotted', value: 'dotted' },
  ];

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  /**
   * Load settings from module storage and initialize working copies
   */
  const loadSettings = () => {
    const persistedColors = ModuleSettings.getClone(SettingKey.storyWebConnectionColors) as PersistedColorOption[];
    const persistedStyles = ModuleSettings.getClone(SettingKey.storyWebConnectionStyles) as PersistedStyleOption[];
    
    originalColors.value = persistedColors.map(c => ({
      ...c,
      uuid: foundry.utils.randomID(),
    }));
    
    originalStyles.value = persistedStyles.map(s => ({
      ...s,
      uuid: foundry.utils.randomID(),
    }));
    
    // Initialize working copies
    workingColors.value = JSON.parse(JSON.stringify(originalColors.value));
    workingStyles.value = JSON.parse(JSON.stringify(originalStyles.value));
  };

  /**
   * Reset working copies to their original saved values
   */
  const onResetClick = () => {
    // Reset working copies to original values
    workingColors.value = JSON.parse(JSON.stringify(originalColors.value));
    workingStyles.value = JSON.parse(JSON.stringify(originalStyles.value));
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
      ui.notifications?.error(localize('applications.storyWebConnections.notifications.duplicateColorIds'));
      return;
    }
    
    if (styleIds.size !== workingStyles.value.length) {
      ui.notifications?.error(localize('applications.storyWebConnections.notifications.duplicateStyleIds'));
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
    
    await ModuleSettings.set(SettingKey.storyWebConnectionColors, persistedColors);
    await ModuleSettings.set(SettingKey.storyWebConnectionStyles, persistedStyles);
    
    // Update original values
    originalColors.value = JSON.parse(JSON.stringify(workingColors.value));
    originalStyles.value = JSON.parse(JSON.stringify(workingStyles.value));
    
    ui.notifications?.info(localize('notifications.changesSaved'));
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
          group: 'connections-dialog', 
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
</style>
