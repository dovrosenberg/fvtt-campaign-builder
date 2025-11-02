<template>
  <!-- this is just a <ul> wrapper around the a type node in the type-grouped tree-->
  <ul class="fcb-directory-tree">
    <SettingDirectoryGroupedType
      v-for="type in sortedTypes"
      :key="type.id"
      :type="type"
      :setting-id="props.settingId"
      :topic="props.topicNode.topicFolder.topic"
    />
  </ul>
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType, } from 'vue';

  // local imports

  // library components

  // local components
  import SettingDirectoryGroupedType from './SettingDirectoryGroupedType.vue';

  // types
  import { DirectoryTopicFolderNode, DirectoryTypeNode, } from '@/classes';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    topicNode: {
      type: Object as PropType<DirectoryTopicFolderNode>,
      required: true,
    }, 
    settingId: {
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
  const sortedTypes = computed((): DirectoryTypeNode[] => {
    const types = props.topicNode.loadedTypes;
    return types.sort((a, b) => a.name.localeCompare(b.name));
  });

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