<template>
  <div
    v-if="isInPlayMode"
    class="wcb-play-mode-navigation flexrow"
  >
    <div class="play-navigation-container flexcol">
      <SessionTabsRow />
      <GeneratorRow />
    </div>
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
    width: 100%;
  }

  .play-navigation-container {
    width: 100%;
    container-type: inline-size;
  }
</style>