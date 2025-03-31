<template>
  <div class="campaign-selector-container" v-if="showSelector">
    <label for="campaign-selector">Campaign:</label>
    <Dropdown
      id="campaign-selector"
      v-model="currentPlayedCampaignId"
      :options="playableCampaigns"
      optionLabel="name"
      optionValue="uuid"
      size="small"
    />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useCampaignStore, useMainStore } from '@/applications/stores';

  // library components
  import Dropdown from 'primevue/dropdown';

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
  padding: 5px 10px;
  background-color: var(--wcb-header-background);
  border-bottom: 1px solid var(--wcb-header-border-color);

  label {
    margin-right: 8px;
    font-weight: bold;
    color: var(--wcb-header-nav-color);
  }
}
</style>