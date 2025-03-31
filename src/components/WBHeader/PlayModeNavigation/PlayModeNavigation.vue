<template>
  <div 
    v-if="isInPlayMode"
    class="wcb-play-mode-navigation flexrow"
  >
    <SessionTabsRow />
    <GeneratorRow />
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore } from '@/applications/stores';

  // components
  import SessionTabsRow from '@/components/WBHeader/PlayModeNavigation/SessionTabsRow.vue';
  import GeneratorRow from '@/components/WBHeader/PlayModeNavigation/GeneratorRow.vue';

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { isInPlayMode } = storeToRefs(mainStore);
</script>

<style lang="scss">
.wcb-play-mode-navigation {
  display: flex;
  flex-direction: column;
  width: 100%;
}
</style>