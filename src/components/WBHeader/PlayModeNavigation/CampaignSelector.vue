<template>
  <div class="campaign-selector-container" v-if="showSelector">
    <label for="campaign-selector">{{localize('fields.campaign')}}:</label>
    <Select
      id="campaign-selector"
      v-model="currentPlayedCampaignId"
      :options="playableCampaigns"
      optionLabel="name"
      optionValue="uuid"
      size="small"
      :pt="{
        root: { class: 'fcb-dropdown' },
        input: { class: 'fcb-dropdown-input' },
        panel: { class: 'fcb-dropdown-panel' },
        item: { class: 'fcb-dropdown-item' }
      }"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useCampaignStore, useMainStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components
  import Select from 'primevue/select';


  // types

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const campaignStore = useCampaignStore();
  const { isInPlayMode } = storeToRefs(mainStore);
  const { currentPlayedCampaignId, playableCampaigns } = storeToRefs(campaignStore);

  ////////////////////////////////
  // data

  // Only show the selector if there are multiple campaigns
  const showSelector = computed(() => {
    return isInPlayMode.value && playableCampaigns.value.length > 1;
  });

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events
</script>

<style lang="scss">
.campaign-selector-container {
  display: flex;
  align-items: center;
  margin-right: 10px;

  label {
    margin-right: 8px;
    font-weight: bold;
    color: var(--color-light-1);
  }

  .fcb-dropdown {
    min-width: 150px;
    font-size: 12px;

    .fcb-dropdown-input {
      padding: 2px 5px;
      border-radius: 3px;
      border: 1px solid #ccc;
      background-color: #fff;
      color: #333;
      font-size: 12px;
      height: 24px;

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
}

.fcb-dropdown-panel {
  border-radius: 3px;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);

  .fcb-dropdown-item {
    padding: 4px 8px;
    font-size: 12px;

    &:hover {
      background-color: rgba(33, 150, 243, 0.1);
    }

    &.p-highlight {
      background-color: #2196F3;
      color: #fff;
    }
  }
}
</style>