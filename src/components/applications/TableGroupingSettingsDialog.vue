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
  import { tableGroupingSettingsApp } from '@/applications/settings/TableGroupingSettingsApplication';
  import AppWindowService from '@/utils/appWindow';
  import { useMainStore } from '@/applications/stores';

  // library components

  // local components
  import ConfigDialogLayout from '@/components/layout/ConfigDialogLayout.vue';

  // types
  import { GroupableItem } from '@/types';
  type TableGroupingSettings = Partial<Record<GroupableItem, boolean>>;

  interface SettingOption {
    settingKey: GroupableItem;
    labelKey: string;
  }

  interface SettingGroup {
    key: string;
    headerKey: string;
    options: SettingOption[];
  }

  // Static array defining all setting groups and their options
  const settingGroups: SettingGroup[] = [
    // {
    //   key: 'settings',
    //   headerKey: 'dialogs.tableGrouping.contentTypes.settings',
    //   options: [
    //     { settingKey: GroupableItem.SettingJournals, labelKey: 'dialogs.tableGrouping.tabs.journals' },
    //   ],
    // },
    // {
    //   key: 'entries',
    //   headerKey: 'dialogs.tableGrouping.contentTypes.entries',
    //   options: [
    //     { settingKey: GroupableItem.EntryJournals, labelKey: 'dialogs.tableGrouping.tabs.journals' },
    //     { settingKey: GroupableItem.EntryCharacters, labelKey: 'dialogs.tableGrouping.tabs.characters' },
    //     { settingKey: GroupableItem.EntryLocations, labelKey: 'dialogs.tableGrouping.tabs.locations' },
    //     { settingKey: GroupableItem.EntryOrganizations, labelKey: 'dialogs.tableGrouping.tabs.organizations' },
    //     { settingKey: GroupableItem.EntryPCs, labelKey: 'dialogs.tableGrouping.tabs.pcs' },
    //     { settingKey: GroupableItem.EntryActors, labelKey: 'dialogs.tableGrouping.tabs.actors' },
    //   ],
    // },
    {
      key: 'campaigns',
      headerKey: 'dialogs.tableGrouping.contentTypes.campaigns',
      options: [
        // { settingKey: GroupableItem.CampaignJournals, labelKey: 'dialogs.tableGrouping.tabs.journals' },
        { settingKey: GroupableItem.CampaignPCs, labelKey: 'dialogs.tableGrouping.tabs.pcs' },
        // { settingKey: GroupableItem.CampaignLore, labelKey: 'dialogs.tableGrouping.tabs.lore' },
        { settingKey: GroupableItem.CampaignIdeas, labelKey: 'dialogs.tableGrouping.tabs.ideas' },
        { settingKey: GroupableItem.CampaignToDos, labelKey: 'dialogs.tableGrouping.tabs.todo' },
      ],
    },
    {
      key: 'arcs',
      headerKey: 'dialogs.tableGrouping.contentTypes.arcs',
      options: [
        // { settingKey: GroupableItem.ArcJournals, labelKey: 'dialogs.tableGrouping.tabs.journals' },
        { settingKey: GroupableItem.ArcLore, labelKey: 'dialogs.tableGrouping.tabs.lore' },
        { settingKey: GroupableItem.ArcVignettes, labelKey: 'dialogs.tableGrouping.tabs.vignettes' },
        { settingKey: GroupableItem.ArcLocations, labelKey: 'dialogs.tableGrouping.tabs.locations' },
        { settingKey: GroupableItem.ArcParticipants, labelKey: 'dialogs.tableGrouping.tabs.participants' },
        { settingKey: GroupableItem.ArcMonsters, labelKey: 'dialogs.tableGrouping.tabs.monsters' },
        { settingKey: GroupableItem.ArcItems, labelKey: 'dialogs.tableGrouping.tabs.magicItems' },
        { settingKey: GroupableItem.ArcIdeas, labelKey: 'dialogs.tableGrouping.tabs.ideas' },
      ],
    },
    {
      key: 'sessions',
      headerKey: 'dialogs.tableGrouping.contentTypes.sessions',
      options: [
        { settingKey: GroupableItem.SessionLore, labelKey: 'dialogs.tableGrouping.tabs.lore' },
        { settingKey: GroupableItem.SessionVignettes, labelKey: 'dialogs.tableGrouping.tabs.vignettes' },
        { settingKey: GroupableItem.SessionLocations, labelKey: 'dialogs.tableGrouping.tabs.locations' },
        { settingKey: GroupableItem.SessionNPCs, labelKey: 'dialogs.tableGrouping.tabs.npcs' },
        { settingKey: GroupableItem.SessionMonsters, labelKey: 'dialogs.tableGrouping.tabs.monsters' },
        { settingKey: GroupableItem.SessionItems, labelKey: 'dialogs.tableGrouping.tabs.magicItems' },
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
  const settings = ref<TableGroupingSettings>({});

  // Initialize all settings to false
  const initializeSettings = () => {
    const allSettings: TableGroupingSettings = {};
    Object.values(GroupableItem).forEach(key => {
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
    // populate any missing ones
    for (const key of Object.keys(settings.value)) {
      settings.value[key] = settings.value[key] || false;
    }

    // Save the settings
    await ModuleSettings.set(SettingKey.tableGroupingSettings, settings.value as Record<GroupableItem, boolean>);

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
