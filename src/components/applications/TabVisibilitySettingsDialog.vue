<!--
TabVisibilitySettingsDialog: Dialog for configuring tab visibility settings

Purpose
- Provides UI for users to configure which tabs are visible for each content type

Responsibilities
- Manages checkbox settings for different content types and their tabs
- Organizes tabs by content type, with Entry tabs further organized by topic
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
      <p class="notes">{{ localize('dialogs.tabVisibility.description') }}</p>
      
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
  import { tabVisibilitySettingsApp } from '@/applications/settings/TabVisibilitySettingsApplication';
  import AppWindowService from '@/utils/appWindow';
  import { useMainStore } from '@/applications/stores';

  // library components

  // local components
  import ConfigDialogLayout from '@/components/layout/ConfigDialogLayout.vue';

  // types
  import { TabVisibilityItem, TabVisibilitySettings } from '@/types';

  interface SettingOption {
    settingKey: TabVisibilityItem;
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
      key: 'setting',
      headerKey: 'dialogs.tabVisibility.contentTypes.setting',
      options: [
        { settingKey: TabVisibilityItem.SettingJournals, labelKey: 'dialogs.tabVisibility.tabs.journals' },
        { settingKey: TabVisibilityItem.SettingTimeline, labelKey: 'dialogs.tabVisibility.tabs.timeline' },
      ],
    },
    {
      key: 'campaign',
      headerKey: 'dialogs.tabVisibility.contentTypes.campaign',
      options: [
        { settingKey: TabVisibilityItem.CampaignJournals, labelKey: 'dialogs.tabVisibility.tabs.journals' },
        { settingKey: TabVisibilityItem.CampaignPCs, labelKey: 'dialogs.tabVisibility.tabs.pcs' },
        { settingKey: TabVisibilityItem.CampaignLore, labelKey: 'dialogs.tabVisibility.tabs.lore' },
        { settingKey: TabVisibilityItem.CampaignIdeas, labelKey: 'dialogs.tabVisibility.tabs.ideas' },
        { settingKey: TabVisibilityItem.CampaignToDo, labelKey: 'dialogs.tabVisibility.tabs.todo' },
        { settingKey: TabVisibilityItem.CampaignStoryWebs, labelKey: 'dialogs.tabVisibility.tabs.storyWebs' },
        { settingKey: TabVisibilityItem.CampaignTimeline, labelKey: 'dialogs.tabVisibility.tabs.timeline' },
      ],
    },
    {
      key: 'arc',
      headerKey: 'dialogs.tabVisibility.contentTypes.arc',
      options: [
        { settingKey: TabVisibilityItem.ArcJournals, labelKey: 'dialogs.tabVisibility.tabs.journals' },
        { settingKey: TabVisibilityItem.ArcLore, labelKey: 'dialogs.tabVisibility.tabs.lore' },
        { settingKey: TabVisibilityItem.ArcVignettes, labelKey: 'dialogs.tabVisibility.tabs.vignettes' },
        { settingKey: TabVisibilityItem.ArcLocations, labelKey: 'dialogs.tabVisibility.tabs.locations' },
        { settingKey: TabVisibilityItem.ArcParticipants, labelKey: 'dialogs.tabVisibility.tabs.participants' },
        { settingKey: TabVisibilityItem.ArcMonsters, labelKey: 'dialogs.tabVisibility.tabs.monsters' },
        { settingKey: TabVisibilityItem.ArcItems, labelKey: 'dialogs.tabVisibility.tabs.magic' },
        { settingKey: TabVisibilityItem.ArcIdeas, labelKey: 'dialogs.tabVisibility.tabs.ideas' },
        { settingKey: TabVisibilityItem.ArcStoryWebs, labelKey: 'dialogs.tabVisibility.tabs.storyWebs' },
        { settingKey: TabVisibilityItem.ArcTimeline, labelKey: 'dialogs.tabVisibility.tabs.timeline' },
      ],
    },
    {
      key: 'session',
      headerKey: 'dialogs.tabVisibility.contentTypes.session',
      options: [
        { settingKey: TabVisibilityItem.SessionLore, labelKey: 'dialogs.tabVisibility.tabs.lore' },
        { settingKey: TabVisibilityItem.SessionVignettes, labelKey: 'dialogs.tabVisibility.tabs.vignettes' },
        { settingKey: TabVisibilityItem.SessionLocations, labelKey: 'dialogs.tabVisibility.tabs.locations' },
        { settingKey: TabVisibilityItem.SessionNPCs, labelKey: 'dialogs.tabVisibility.tabs.npcs' },
        { settingKey: TabVisibilityItem.SessionMonsters, labelKey: 'dialogs.tabVisibility.tabs.monsters' },
        { settingKey: TabVisibilityItem.SessionMagic, labelKey: 'dialogs.tabVisibility.tabs.magic' },
        { settingKey: TabVisibilityItem.SessionPCs, labelKey: 'dialogs.tabVisibility.tabs.pcs' },
        { settingKey: TabVisibilityItem.SessionStoryWebs, labelKey: 'dialogs.tabVisibility.tabs.storyWebs' },
        { settingKey: TabVisibilityItem.SessionTimeline, labelKey: 'dialogs.tabVisibility.tabs.timeline' },
      ],
    },
    {
      key: 'entryCharacter',
      headerKey: 'dialogs.tabVisibility.contentTypes.entryCharacter',
      options: [
        { settingKey: TabVisibilityItem.EntryCharacterJournals, labelKey: 'dialogs.tabVisibility.tabs.journals' },
        { settingKey: TabVisibilityItem.EntryCharacterLocations, labelKey: 'dialogs.tabVisibility.tabs.locations' },
        { settingKey: TabVisibilityItem.EntryCharacterOrganizations, labelKey: 'dialogs.tabVisibility.tabs.organizations' },
        { settingKey: TabVisibilityItem.EntryCharacterPCs, labelKey: 'dialogs.tabVisibility.tabs.pcs' },
        { settingKey: TabVisibilityItem.EntryCharacterSessions, labelKey: 'dialogs.tabVisibility.tabs.sessions' },
        { settingKey: TabVisibilityItem.EntryCharacterFoundry, labelKey: 'dialogs.tabVisibility.tabs.foundry' },
        { settingKey: TabVisibilityItem.EntryCharacterActors, labelKey: 'dialogs.tabVisibility.tabs.actors' },
        { settingKey: TabVisibilityItem.EntryCharacterTimeline, labelKey: 'dialogs.tabVisibility.tabs.timeline' },
      ],
    },
    {
      key: 'entryLocation',
      headerKey: 'dialogs.tabVisibility.contentTypes.entryLocation',
      options: [
        { settingKey: TabVisibilityItem.EntryLocationJournals, labelKey: 'dialogs.tabVisibility.tabs.journals' },
        { settingKey: TabVisibilityItem.EntryLocationCharacters, labelKey: 'dialogs.tabVisibility.tabs.characters' },
        { settingKey: TabVisibilityItem.EntryLocationOrganizations, labelKey: 'dialogs.tabVisibility.tabs.organizations' },
        { settingKey: TabVisibilityItem.EntryLocationPCs, labelKey: 'dialogs.tabVisibility.tabs.pcs' },
        { settingKey: TabVisibilityItem.EntryLocationSessions, labelKey: 'dialogs.tabVisibility.tabs.sessions' },
        { settingKey: TabVisibilityItem.EntryLocationFoundry, labelKey: 'dialogs.tabVisibility.tabs.foundry' },
        { settingKey: TabVisibilityItem.EntryLocationScenes, labelKey: 'dialogs.tabVisibility.tabs.scenes' },
        { settingKey: TabVisibilityItem.EntryLocationTimeline, labelKey: 'dialogs.tabVisibility.tabs.timeline' },
      ],
    },
    {
      key: 'entryOrganization',
      headerKey: 'dialogs.tabVisibility.contentTypes.entryOrganization',
      options: [
        { settingKey: TabVisibilityItem.EntryOrganizationJournals, labelKey: 'dialogs.tabVisibility.tabs.journals' },
        { settingKey: TabVisibilityItem.EntryOrganizationCharacters, labelKey: 'dialogs.tabVisibility.tabs.characters' },
        { settingKey: TabVisibilityItem.EntryOrganizationLocations, labelKey: 'dialogs.tabVisibility.tabs.locations' },
        { settingKey: TabVisibilityItem.EntryOrganizationPCs, labelKey: 'dialogs.tabVisibility.tabs.pcs' },
        { settingKey: TabVisibilityItem.EntryOrganizationSessions, labelKey: 'dialogs.tabVisibility.tabs.sessions' },
        { settingKey: TabVisibilityItem.EntryOrganizationFoundry, labelKey: 'dialogs.tabVisibility.tabs.foundry' },
        { settingKey: TabVisibilityItem.EntryOrganizationTimeline, labelKey: 'dialogs.tabVisibility.tabs.timeline' },
      ],
    },
    {
      key: 'entryPC',
      headerKey: 'dialogs.tabVisibility.contentTypes.entryPC',
      options: [
        { settingKey: TabVisibilityItem.EntryPCJournals, labelKey: 'dialogs.tabVisibility.tabs.journals' },
        { settingKey: TabVisibilityItem.EntryPCCharacters, labelKey: 'dialogs.tabVisibility.tabs.characters' },
        { settingKey: TabVisibilityItem.EntryPCLocations, labelKey: 'dialogs.tabVisibility.tabs.locations' },
        { settingKey: TabVisibilityItem.EntryPCOrganizations, labelKey: 'dialogs.tabVisibility.tabs.organizations' },
        { settingKey: TabVisibilityItem.EntryPCFoundry, labelKey: 'dialogs.tabVisibility.tabs.foundry' },
        { settingKey: TabVisibilityItem.EntryPCTimeline, labelKey: 'dialogs.tabVisibility.tabs.timeline' },
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
  const settings = ref<TabVisibilitySettings>({});

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onClickSubmit = async () => {
    // Save the settings
    await ModuleSettings.set(SettingKey.tabVisibilitySettings, settings.value);

    if (AppWindowService.isCampaignBuilderAppOpen()) {
      await mainStore.refreshCurrentContent();
    }
    
    // Close the application using the global reference
    tabVisibilitySettingsApp?.close();
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle hooks
  onMounted(() => {
    settings.value = ModuleSettings.get(SettingKey.tabVisibilitySettings);
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
