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
      
      <!-- Settings Section -->
      <div class="fcb-settings-groups">
        <h3 class="fcb-settings-group-header">
          {{ localize('dialogs.tableGrouping.contentTypes.settings') }}
        </h3>
        <div class="fcb-settings-group">
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.SettingJournals]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.journals') }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Entries Section -->
      <div class="fcb-settings-groups">
        <h3 class="fcb-settings-group-header">
          {{ localize('dialogs.tableGrouping.contentTypes.entries') }}
        </h3>
        <div class="fcb-settings-group">
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.EntryJournals]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.journals') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.EntryCharacters]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.characters') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.EntryLocations]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.locations') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.EntryOrganizations]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.organizations') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.EntryPCs]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.pcs') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.EntryActors]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.actors') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.EntrySessions]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.sessions') }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Campaigns Section -->
      <div class="fcb-settings-groups">
        <h3 class="fcb-settings-group-header">
          {{ localize('dialogs.tableGrouping.contentTypes.campaigns') }}
        </h3>
        <div class="fcb-settings-group">
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.CampaignJournals]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.journals') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.CampaignPCs]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.pcs') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.CampaignLore]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.lore') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.CampaignIdeas]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.ideas') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.CampaignToDo]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.todo') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.CampaignStoryWebs]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.storyWebs') }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Arcs Section -->
      <div class="fcb-settings-groups">
        <h3 class="fcb-settings-group-header">
          {{ localize('dialogs.tableGrouping.contentTypes.arcs') }}
        </h3>
        <div class="fcb-settings-group">
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.ArcLore]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.lore') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.ArcVignettes]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.vignettes') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.ArcLocations]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.locations') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.ArcParticipants]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.participants') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.ArcMonsters]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.monsters') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.ArcIdeas]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.ideas') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.ArcStoryWebs]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.storyWebs') }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Sessions Section -->
      <div class="fcb-settings-groups">
        <h3 class="fcb-settings-group-header">
          {{ localize('dialogs.tableGrouping.contentTypes.sessions') }}
        </h3>
        <div class="fcb-settings-group">
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.SessionLore]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.lore') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.SessionVignettes]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.vignettes') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.SessionLocations]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.locations') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.SessionCharacters]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.npcs') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.SessionMonsters]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.monsters') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.SessionItems]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.magicItems') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.SessionPCs]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.pcs') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.SessionStoryWebs]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.storyWebs') }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Fronts Section -->
      <div class="fcb-settings-groups">
        <h3 class="fcb-settings-group-header">
          {{ localize('dialogs.tableGrouping.contentTypes.fronts') }}
        </h3>
        <div class="fcb-settings-group">
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.FrontCharacters]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.participants') }}</span>
            </label>
          </div>
          <div class="fcb-setting-item">
            <label class="fcb-setting-label">
              <input
                type="checkbox"
                v-model="settings[TableGroupingSetting.FrontLocations]"
                class="fcb-setting-checkbox"
              />
              <span class="fcb-setting-text">{{ localize('dialogs.tableGrouping.tabs.grimPortents') }}</span>
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
