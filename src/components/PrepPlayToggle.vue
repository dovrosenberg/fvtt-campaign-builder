<template>
  <div class="prep-play-toggle">
    <span 
      class="mode-label" 
      :class="{ active: isInPrepMode }"
    >
      Prep
    </span>
    <ToggleSwitch 
      v-model="isInPrepMode" 
      :pt="{
        root: { class: 'wcb-toggle-switch' }
      }"
    />
    <span 
      class="mode-label" 
      :class="{ active: !isInPrepMode }"
    >
      Play
    </span>
  </div>
</template>

<script setup lang="ts">
  import ToggleSwitch from 'primevue/toggleswitch';
  import { storeToRefs } from 'pinia';
  import { useMainStore } from '@/applications/stores';

  const mainStore = useMainStore();
  const { isInPrepMode } = storeToRefs(mainStore);

</script>

<style lang="scss" scoped>
.prep-play-toggle {
  display: flex;
  align-items: center;
  margin-right: 10px;
  
  .mode-label {
    margin: 0 5px;
    color: #666;
    font-weight: normal;
    
    &.active {
      color: #2196F3;
      font-weight: bold;
    }
  }
  
  :deep(.wcb-toggle-switch) {
    .p-toggleswitch-slider {
      background-color: #ccc;
    }
    
    &.p-toggleswitch-checked .p-toggleswitch-slider {
      background-color: #2196F3;
    }
  }
}
</style>