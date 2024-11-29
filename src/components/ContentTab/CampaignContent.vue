<template>
  <form 
    :class="'flexcol fwb-journal-subsheet'" 
  >
    <div class="sheet-container detailed flexcol">
      {{ currentCampaign?.name}}
    </div>
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore } from '@/applications/stores';

  // library components

  // local components
  
  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentCampaign } = storeToRefs(mainStore);

  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers


  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">

</style>