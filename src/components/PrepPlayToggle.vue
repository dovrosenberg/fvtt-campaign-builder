<template>
  <div 
    class="prep-play-toggle"
    @click.stop=""
  >
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
  </div>
</template>

<script setup lang="ts">
// library imports
  import { computed, onMounted, watch, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useCampaignStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components
  import ToggleSwitch from 'primevue/toggleswitch';

  // local components
  import CampaignSelector from '@/components/WBHeader/PlayModeNavigation/CampaignSelector.vue';
  
  // Store references
  const mainStore = useMainStore();
  const campaignStore = useCampaignStore();
  const { isInPlayMode, currentWorld } = storeToRefs(mainStore);
  const { playableCampaigns } = storeToRefs(campaignStore);

  // Data
  const toggleValue = ref<boolean>(isInPlayMode.value);

  // Computed data
  // Only show the selector if there are multiple campaigns and we're in play mode
  const showCampaignSelector = computed(() => {
    return isInPlayMode.value && playableCampaigns.value.length > 1;
  });

  const playableCampaignExists = computed(() => {
    return playableCampaigns.value.length > 0;
  });

  // Methods
  
  // Event handlers
  const onToggleChange = () => {
    isInPlayMode.value = toggleValue.value;
  }

  // Watchers
  watch(() => isInPlayMode, (newValue) => {
    toggleValue.value = newValue && playableCampaignExists.value;
  });

  watch(() => currentWorld.value, async (newWorld) => {
    if (newWorld) {
      //  make sure the world campaign list is up to date
      await newWorld.loadCampaigns();

      toggleValue.value = isInPlayMode.value && playableCampaignExists.value;
    }
  });

  // Lifecycle
  onMounted(async () => {
    toggleValue.value = isInPlayMode.value && playableCampaignExists.value;
  });
</script>

<style lang="scss" scoped>
.prep-play-toggle {
  display: flex;
  align-items: center;
  margin-right: 10px;

  .campaign-selector-container {
    margin-right: 10px;

    select {
      padding: 2px 5px;
      border-radius: 3px;
      border: 1px solid #ccc;
      background-color: #fff;
      color: #333;
      font-size: 12px;

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
    color: #666;
    font-weight: normal;

    &.active {
      color: #2196F3;
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
</style>