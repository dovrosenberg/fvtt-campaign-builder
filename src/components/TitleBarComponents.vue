<template>
  <div 
    class="prep-play-toggle"
    @click.stop=""
  >
    <!-- This wraps everything but the maximize button -->
    <div class="campaign-builder-controls">
      <!-- Campaign drop down if more than one option -->
      <CampaignSelector 
        v-if="showCampaignSelector"
      />

      <!-- Prep/Play toggle -->
      <span
        class="mode-label"
        :class="{ active: !isInPlayMode }"
      >
        {{ localize('labels.prep' )}}
      </span>
      <ToggleSwitch
        v-model="toggleValue"
        :disabled="!playableCampaignExists"
        :pt="{
          root: { class: 'fcb-toggle-switch' }
        }"
        @change="onToggleChange"
      />
      <span
        class="mode-label"
        :class="{ active: isInPlayMode && playableCampaignExists }"
      >
      {{ localize('labels.play' )}}
      </span>
      <span
        v-if="!playableCampaignExists"
        style="margin-left: 5px; cursor: default"
      >
        <i class="fas fa-info-circle tooltip-icon" :data-tooltip="localize('tooltips.playModeNoCampaigns')"></i>
      </span>
      
      <!-- Separator -->
      <div class="separator"></div>
      
      <!-- Global Search Box -->
      <div class="header-search-container">
        <Search 
          :max-results="5"
        />
      </div>
    </div>

    <!-- Maximize button - match the style of the close button-->
    <button 
      type="button" 
      :class="[
        'header-control',
        'icon',
        isMaximized ? 'fas fa-regular fa-window-restore' : 'fas fa-regular fa-window-maximize'
      ]"
      :data-tooltip="isMaximized ? localize('tooltips.restoreWindow') : localize('tooltips.maximizeWindow')" 
      aria-describedby="tooltip"
      @click.stop="onToggleMaximize"
    >
    </button>
  </div>
</template>

<script setup lang="ts">
// library imports
  import { computed, onMounted, watch, ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, usePlayingStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { SettingKey, ModuleSettings, WindowBounds, moduleId } from '@/settings';
  import { CampaignBuilderApplication } from '@/applications/CampaignBuilder';

  // library components
  import ToggleSwitch from 'primevue/toggleswitch';

  // local components
  import CampaignSelector from '@/components/FCBHeader/PlayModeNavigation/CampaignSelector.vue';
  import Search from '@/components/Search.vue';
  
  // Store references
  const mainStore = useMainStore();
  const playingStore = usePlayingStore();
  const { isInPlayMode, currentSetting } = storeToRefs(mainStore);
  const { playableCampaigns } = storeToRefs(playingStore);

  // Data
  const toggleValue = ref<boolean>(isInPlayMode.value);
  const isMaximized = ref<boolean>(false);

  // Computed data
  // Only show the selector if there are multiple campaigns and we're in play mode
  const showCampaignSelector = computed(() => {
    return isInPlayMode.value && playableCampaigns.value.length > 1;
  });

  const playableCampaignExists = computed(() => {
    return playableCampaigns.value.length > 0;
  });

  // Methods
  const renderRightSize = async () => {
    // Get the CampaignBuilder application instance
    // @ts-ignore
    const app = game.modules.get(moduleId)?.activeWindow as CampaignBuilderApplication;
    if (!app) return;

    if (isMaximized.value) {
      // Store current position before maximizing
      const pos = app.position;
      const previousBounds = {
        left: pos.left,
        top: pos.top,
        width: pos.width as number,
        height: pos.height as number
      };

      // Foundry limits the window to available size, so we just set it to be huge
      app.setPosition({
        left: 0,
        top: 0,
        width: 500000,
        height: 500000
      });      
    } else {
      const previousBounds = ModuleSettings.get(SettingKey.mainWindowBounds) || { left: 0, top: 0, width: 900, height: 600 };

      app.setPosition({
        left: previousBounds.left,
        top: previousBounds.top,
        width: previousBounds.width,
        height: previousBounds.height
      });      
    }
  }
  
  // Event handlers
  const onToggleChange = () => {
    isInPlayMode.value = toggleValue.value;
  }

  const onToggleMaximize = async () => {
    isMaximized.value = !isMaximized.value; 
 
    await ModuleSettings.set(SettingKey.mainWindowBounds, {
      ...ModuleSettings.get(SettingKey.mainWindowBounds),
      maximized: isMaximized.value
    });
  }


  // Watchers
  watch(() => isInPlayMode, (newValue) => {
    toggleValue.value = newValue && playableCampaignExists.value;
  });
  
  watch(() => isMaximized.value, () => {
    renderRightSize();
  });


  watch(() => currentSetting.value, async (newSetting) => {
    if (newSetting) {
      //  make sure the setting campaign list is up to date
      await newSetting.loadCampaigns();

      toggleValue.value = isInPlayMode.value && playableCampaignExists.value;
    }
  });

  // Lifecycle
  onMounted(async () => {
    toggleValue.value = isInPlayMode.value && playableCampaignExists.value;
    
    // Load maximized state from settings and restore if needed
    const maximized = ModuleSettings.get(SettingKey.mainWindowBounds)?.maximized || false;
    if (maximized) {
      isMaximized.value = true;
        renderRightSize();
    }
  });
</script>

<style lang="scss" scoped>
.prep-play-toggle {
  display: flex;
  align-items: center;
  font-family: var(--fcb-font-family);

  .campaign-builder-controls {
    margin-right: 10px;
    display: flex;

    // Separator styling
    .separator {
      height: 1.25rem;
      width: 1px;
      background-color: #ccc;
      margin: 0 10px;
    }
    
    // Header search styling
    .header-search-container {
      max-width: 200px;
      margin-left: 5px;    
    }

    // Header button styling
    .header-button {
      cursor: pointer;
      color: var(--fcb-gray-300);
      font-size: 14px;
      padding: 2px 4px;
      border-radius: 2px;
      transition: color 0.2s;

      &:hover {
        color: var(--fcb-accent-300);
      }

      &.active {
        color: var(--fcb-accent-300);
      }
    }

    .campaign-selector-container {
      margin-right: 10px;
      margin-left: 10px;

      select {
        padding: 2px 5px;
        border-radius: 3px;
        border: 1px solid #ccc;
        background-color: #fff;
        color: #333;
        font-size: var(--font-size-12);

        &:hover {
          border-color: #2196F3;
        }

        &:focus {
          outline: none;
          border-color: #2196F3;
          box-shadow: 0 0 3px rgba(33, 150, 243, 0.5);
        }
      }
    }

    .mode-label {
      margin: 0 5px;
      color: var(--fcb-gray-300);
      font-weight: normal;

      &.active {
        color: var(--fcb-accent-300);
        font-weight: bold;
      }
    }

    :deep(.fcb-toggle-switch) {
      .p-toggleswitch-slider {
        background-color: #ccc;
      }

      &.p-toggleswitch-checked .p-toggleswitch-slider {
        background-color: #2196F3;
      }
    }
  }
}
</style>