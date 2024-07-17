<template>
  <ul class="fwb-directory-tree">
    <DirectoryGroupedType
      v-for="type in props.pack.loadedTypes"
      :key="type.id"
      :type="type"
      :pack="props.pack"
      :search-text="props.searchText"
    />
  </ul>
</template>

<script setup lang="ts">
  // library imports
  import { PropType, } from 'vue';

  // local imports

  // library components

  // local components
  import DirectoryGroupedType from './DirectoryGroupedType.vue';

  // types
  import { DirectoryPack, } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    pack: {
      type: Object as PropType<DirectoryPack>,
      required: true,
    }, 
    searchText: {
      type: String,
      required: true,
    },
  });
  
  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style>