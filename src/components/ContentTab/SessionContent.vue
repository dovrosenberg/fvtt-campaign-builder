<template>
  <form 
    :class="'flexcol fwb-journal-subsheet" 
  >
    <div class="sheet-container detailed flexcol">
      {{ currentSession.name}}
    </div>
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { PropType } from 'vue';

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
  const { currentSession } = storeToRefs(mainStore);
  
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