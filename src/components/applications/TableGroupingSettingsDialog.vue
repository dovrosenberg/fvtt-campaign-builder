<!--
TableGroupingSettingsDialog: Dialog for configuring table grouping settings

Purpose
- Provides UI for users to configure which content types use grouped tables

Responsibilities
- Manages checkbox settings for different content types and their tabs
- Only shows relevant table types for each content type
- Saves settings to ModuleSettings
- Closes the dialog after saving

Props
- None

Emits
- None

Slots
- None

Dependencies
- Stores: useMainStore
- Composables: None
- Services/API: ModuleSettings

-->

<template>
  <ConfigDialogLayout>
    <template #scrollSection>
      <p class="notes">{{ localize('dialogs.tableGrouping.description') }}</p>
      
      <div
        v-for="group in settingGroups"
        :key="group.key"
        class="fcb-settings-groups"
      >
        <h3 class="fcb-settings-group-header">
          {{ localize(group.headerKey) }}
        </h3>
        <div class="fcb-settings-group">
          <div
            v-for="option in group.options"
            :key="option.settingKey"
            class="fcb-setting-item"
          >
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[option.settingKey]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize(option.labelKey) }}</span>
            </label>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <button @click="onClickSubmit" class="fcb-button fcb-button-primary">
        <i class="fa-solid fa-save"></i> {{ localize('labels.saveChanges') }}
      </button>
    </template>
  </ConfigDialogLayout>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings/ModuleSettings';
  import { TableGroupingSetting } from '@/types/tableGrouping';
  import { tableGroupingSettingsApp } from '@/applications/settings/TableGroupingSettingsApplication';
  import AppWindowService from '@/utils/appWindow';
  import { useMainStore } from '@/applications/stores';

  // library components

  // local components
  import ConfigDialogLayout from '@/components/layout/ConfigDialogLayout.vue';

  // types
  type TableGroupingSettingsRef = Partial<Record<TableGroupingSetting, boolean>>;

  interface SettingOption {
    settingKey: TableGroupingSetting;
    labelKey: string;
  }

  interface SettingGroup {
    key: string;
    headerKey: string;
    options: SettingOption[];
  }

  // Static array defining all setting groups and their options
  const settingGroups: SettingGroup[] = [
    {
      key: 'settings',
      headerKey: 'dialogs.tableGrouping.contentTypes.settings',
      options: [
        { settingKey: TableGroupingSetting.SettingJournals, labelKey: 'dialogs.tableGrouping.tabs.journals' },
      ],
    },
    {
      key: 'entries',
      headerKey: 'dialogs.tableGrouping.contentTypes.entries',
      options: [
        { settingKey: TableGroupingSetting.EntryJournals, labelKey: 'dialogs.tableGrouping.tabs.journals' },
        { settingKey: TableGroupingSetting.EntryCharacters, labelKey: 'dialogs.tableGrouping.tabs.characters' },
        { settingKey: TableGroupingSetting.EntryLocations, labelKey: 'dialogs.tableGrouping.tabs.locations' },
        { settingKey: TableGroupingSetting.EntryOrganizations, labelKey: 'dialogs.tableGrouping.tabs.organizations' },
        { settingKey: TableGroupingSetting.EntryPCs, labelKey: 'dialogs.tableGrouping.tabs.pcs' },
        { settingKey: TableGroupingSetting.EntryActors, labelKey: 'dialogs.tableGrouping.tabs.actors' },
        { settingKey: TableGroupingSetting.EntrySessions, labelKey: 'dialogs.tableGrouping.tabs.sessions' },
      ],
    },
    {
      key: 'campaigns',
      headerKey: 'dialogs.tableGrouping.contentTypes.campaigns',
      options: [
        { settingKey: TableGroupingSetting.CampaignJournals, labelKey: 'dialogs.tableGrouping.tabs.journals' },
        { settingKey: TableGroupingSetting.CampaignPCs, labelKey: 'dialogs.tableGrouping.tabs.pcs' },
        { settingKey: TableGroupingSetting.CampaignLore, labelKey: 'dialogs.tableGrouping.tabs.lore' },
        { settingKey: TableGroupingSetting.CampaignIdeas, labelKey: 'dialogs.tableGrouping.tabs.ideas' },
        { settingKey: TableGroupingSetting.CampaignToDos, labelKey: 'dialogs.tableGrouping.tabs.todo' },
      ],
    },
    {
      key: 'arcs',
      headerKey: 'dialogs.tableGrouping.contentTypes.arcs',
      options: [
        { settingKey: TableGroupingSetting.ArcLore, labelKey: 'dialogs.tableGrouping.tabs.lore' },
        { settingKey: TableGroupingSetting.ArcVignettes, labelKey: 'dialogs.tableGrouping.tabs.vignettes' },
        { settingKey: TableGroupingSetting.ArcLocations, labelKey: 'dialogs.tableGrouping.tabs.locations' },
        { settingKey: TableGroupingSetting.ArcParticipants, labelKey: 'dialogs.tableGrouping.tabs.participants' },
        { settingKey: TableGroupingSetting.ArcMonsters, labelKey: 'dialogs.tableGrouping.tabs.monsters' },
        { settingKey: TableGroupingSetting.ArcIdeas, labelKey: 'dialogs.tableGrouping.tabs.ideas' },
      ],
    },
    {
      key: 'sessions',
      headerKey: 'dialogs.tableGrouping.contentTypes.sessions',
      options: [
        { settingKey: TableGroupingSetting.SessionLore, labelKey: 'dialogs.tableGrouping.tabs.lore' },
        { settingKey: TableGroupingSetting.SessionVignettes, labelKey: 'dialogs.tableGrouping.tabs.vignettes' },
        { settingKey: TableGroupingSetting.SessionLocations, labelKey: 'dialogs.tableGrouping.tabs.locations' },
        { settingKey: TableGroupingSetting.SessionCharacters, labelKey: 'dialogs.tableGrouping.tabs.npcs' },
        { settingKey: TableGroupingSetting.SessionMonsters, labelKey: 'dialogs.tableGrouping.tabs.monsters' },
        { settingKey: TableGroupingSetting.SessionItems, labelKey: 'dialogs.tableGrouping.tabs.magicItems' },
        { settingKey: TableGroupingSetting.SessionPCs, labelKey: 'dialogs.tableGrouping.tabs.pcs' },
      ],
    },
    {
      key: 'fronts',
      headerKey: 'dialogs.tableGrouping.contentTypes.fronts',
      options: [
        { settingKey: TableGroupingSetting.FrontCharacters, labelKey: 'dialogs.tableGrouping.tabs.participants' },
        { settingKey: TableGroupingSetting.FrontLocations, labelKey: 'dialogs.tableGrouping.tabs.grimPortents' },
      ],
    },
  ];

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();

  ////////////////////////////////
  // data
  const settings = ref<TableGroupingSettingsRef>({});

  // Initialize all settings to false
  const initializeSettings = () => {
    const allSettings: TableGroupingSettingsRef = {};
    Object.values(TableGroupingSetting).forEach(key => {
      allSettings[key] = false;
    });
    settings.value = allSettings;
  };

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onClickSubmit = async () => {
    // Save the settings
    await ModuleSettings.set(SettingKey.tableGroupingSettings, settings.value);

    if (AppWindowService.isCampaignBuilderAppOpen()) {
      await mainStore.refreshCurrentContent();
    }
    
    // Close the application using the global reference
    tableGroupingSettingsApp?.close();
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle hooks
  onMounted(() => {
    // Initialize default values
    initializeSettings();
    
    // Load current settings
    try {
      const currentSettings = ModuleSettings.get(SettingKey.tableGroupingSettings);
      if (currentSettings) {
        // Merge with defaults to ensure all keys exist
        settings.value = { ...settings.value, ...currentSettings };
      }
    } catch (e) {
      console.warn('Could not load table grouping settings, using defaults:', e);
    }
  });
</script>

<style lang="scss" scoped>
  .fcb-settings-groups {
    margin-bottom: 32px;
    
    .fcb-settings-group-header {
      margin: 0 0 12px 0;
      padding: 0 16px;
      color: var(--fcb-text-primary);
      font-size: var(--fcb-font-size-large);
      font-weight: 600;
    }
  }
  
  .fcb-settings-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 16px;
    
    .fcb-setting-item {
      .fcb-setting-label {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: background-color 0.2s ease;
        
        &:hover {
          background-color: var(--fcb-surface-hover);
        }
        
        .fcb-setting-checkbox {
          width: 18px;
          height: 18px;
          accent-color: var(--fcb-primary);
        }
        
        .fcb-setting-text {
          font-size: var(--fcb-font-size-medium);
          color: var(--fcb-text-primary);
        }
      }
    }
  }
  
  .notes {
    margin: 0 0 16px 0;
    padding: 0 16px;
    color: var(--fcb-text-muted);
    font-size: var(--fcb-font-size-small);
  }
</style>
