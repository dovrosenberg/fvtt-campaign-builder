<template>
  <div
    v-if="isInPlayMode"
    class="fcb-play-mode-navigation flexrow"
  >
    <div class="play-navigation-container flexcol">
      <SessionButtonsBar />
      <GeneratorBar />
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore } from '@/applications/stores';

  // components
  import SessionButtonsBar from '@/components/FCBHeader/PlayModeNavigation/SessionButtonsBar.vue';
  import GeneratorBar from '@/components/FCBHeader/PlayModeNavigation/GeneratorBar.vue';

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { isInPlayMode } = storeToRefs(mainStore);
</script>

<style lang="scss">
  .fcb-play-mode-navigation {
    width: 100%;
    font-family: var(--fcb-font-family);
  }

  .play-navigation-container {
    width: 100%;
    container-type: inline-size;
  }
</style>