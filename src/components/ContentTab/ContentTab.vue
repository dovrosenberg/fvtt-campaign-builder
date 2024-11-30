<template>
  <div 
    ref="contentRef"
    class="sheet fwb-journal-sheet"
  >      
    <div v-if="currentContentType===WindowTabType.Entry">
      <EntryContent />
    </div>
    <div v-else-if="currentContentType===WindowTabType.Session">
      <SessionContent />
    </div>
    <div v-else-if="currentContentType===WindowTabType.Campaign">
      <CampaignContent />
    </div>
    <div v-else>
      <HomePage />
    </div>
  </div>
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';

   // local imports
  import { useMainStore, } from '@/applications/stores';

  // library components

  // local components
  import EntryContent from './EntryContent.vue';
  import SessionContent from './SessionContent.vue';
  import CampaignContent from './CampaignContent.vue';
  import HomePage from './HomePage.vue';
  
  // types
  import { WindowTabType } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentContentType } = storeToRefs(mainStore); 

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