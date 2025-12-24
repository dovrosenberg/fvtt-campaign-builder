<template>
  <div class="fcb-image-settings">
    <div class="fcb-settings-header">
      <h3>{{ localize('dialogs.imageSettings.title') }}</h3>
      <p class="notes">{{ localize('dialogs.imageSettings.description') }}</p>
    </div>

    <form @submit.prevent="onSubmit">
      <div class="fcb-settings-group">
        <div class="fcb-setting-item" v-for="setting in settings" :key="setting.key">
          <label class="fcb-setting-label">
            <input
              type="checkbox"
              :name="`showImages.${setting.key}`"
              v-model="setting.value"
              class="fcb-setting-checkbox"
            />
            <span class="fcb-setting-text">{{ setting.label }}</span>
          </label>
        </div>
      </div>

      <div class="fcb-settings-actions">
        <button type="submit" class="fcb-button fcb-button-primary">
          <i class="fas fa-save"></i> {{ localize('labels.save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings/ModuleSettings';
  import { imageSettingsApp } from '@/applications/settings/ImageSettingsApplication';
  import { isCampaignBuilderAppOpen } from '@/utils/appWindow';
  import { useMainStore } from '@/applications/stores';

  // types
  interface ImageSetting {
    key: string;
    label: string;
    value: boolean;
  }

  // data
  const settings = ref<ImageSetting[]>([
    { key: 'settings', label: localize('dialogs.imageSettings.settings'), value: true },
    { key: 'entries', label: localize('dialogs.imageSettings.entries'), value: true },
    { key: 'campaigns', label: localize('dialogs.imageSettings.campaigns'), value: true },
    { key: 'arcs', label: localize('dialogs.imageSettings.arcs'), value: true },
    { key: 'sessions', label: localize('dialogs.imageSettings.sessions'), value: true },
    { key: 'fronts', label: localize('dialogs.imageSettings.fronts'), value: true },
  ]);

  // methods
  const onSubmit = async () => {
    const showImages = {
      settings: settings.value[0].value,
      entries: settings.value[1].value,
      campaigns: settings.value[2].value,
      arcs: settings.value[3].value,
      sessions: settings.value[4].value,
      fronts: settings.value[5].value,
    };
    
    // Save the settings
    await ModuleSettings.set(SettingKey.showImages, showImages);

    if (isCampaignBuilderAppOpen()) {
      await useMainStore().refreshCurrentContent();
    }
    
    // Close the application using the global reference
    imageSettingsApp?.close();
  };

  // lifecycle
  onMounted(() => {
    // Load current settings
    try {
      const currentSettings = ModuleSettings.get(SettingKey.showImages);
      settings.value[0].value = currentSettings.settings ?? true;
      settings.value[1].value = currentSettings.entries ?? true;
      settings.value[2].value = currentSettings.campaigns ?? true;
      settings.value[3].value = currentSettings.arcs ?? true;
      settings.value[4].value = currentSettings.sessions ?? true;
      settings.value[5].value = currentSettings.fronts ?? true;
    } catch (e) {
      console.warn('Could not load image settings, using defaults:', e);
    }
  });
</script>

<style lang="scss" scoped>
  .fcb-image-settings {
    padding: 16px;
    
    .fcb-settings-header {
      margin-bottom: 20px;
      
      h3 {
        margin: 0 0 8px 0;
        color: var(--fcb-text-primary);
      }
      
      .notes {
        margin: 4px 0;
        color: var(--fcb-text-muted);
        font-size: var(--fcb-font-size-small);
      }
    }
    
    .fcb-settings-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
      
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
    
    .fcb-settings-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      
      .fcb-button {
        padding: 8px 16px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        font-size: var(--fcb-font-size-medium);
        display: flex;
        align-items: center;
        gap: 8px;
        
        &.fcb-button-primary {
          background-color: var(--fcb-primary);
          color: white;
          
          &:hover {
            background-color: var(--fcb-primary-dark);
          }
        }
      }
    }
  }
</style>