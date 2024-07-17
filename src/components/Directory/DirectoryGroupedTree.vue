<template>
  <ul class="fwb-directory-tree">
    <li
      v-for="type in packTypes"
      :key="type"
    >
      <!-- TODO: track expanded state-->
      <div 
        class="details"
        :open="true"
      >
        <div class="summary top">      
          <div 
            class="fwb-directory-expand-button"
            @click="onEntryToggleClick"
          >
            <span v-if="true">-</span><span v-else>+</span>
          </div>
          <div 
            class="fwb-current-directory-type"
            @drop="onDrop($event, type)"
          >
            {{ type }}
          </div>
        </div>
        <ul>
          <!-- if not expanded, we style the same way, but don't add any of the children (because they might not be loaded) -->
          <div v-if="true">
            <li 
              v-for="node in typeEntries(type)"
              :key="node.id"
            >
              <div 
                :class="`${node.id===currentEntryId ? 'fwb-current-directory-entry' : ''}`"
                style="pointer-events: auto;"
                draggable="true"
                @click="onDirectoryItemClick($event, node)"
                @dragstart="onDragStart($event, node.id)"
                @drop="onDrop($event, node.id)"
              >
                {{ node.name }}
              </div>
            </li>
          </div>
        </ul>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
  import { useMainStore } from '@/applications/stores';
  import { EntryFlagKey, EntryFlags } from '@/settings/EntryFlags';

  // library components

  // local components

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
  const mainStore = useMainStore();
  const { currentWorldId, currentEntryId } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data
  const packTypes = computed(() => {
    if (!currentWorldId.value)
      return [];

    const types = WorldFlags.get(currentWorldId.value, WorldFlagKey.types);

    return types[props.pack.topic].concat(['(none)']).sort();
  });


  ////////////////////////////////
  // methods
  const typeEntries = async (type: string) => {
    const allEntries = await props.pack.pack.getDocuments({});

    return allEntries.filter((e)=>EntryFlags.get(e, EntryFlagKey.type)==type).map((entry) => ({
      id: entry.uuid,
      name: entry.name || '<Blank>',
      expanded: false,  // TODO- load this, too
    })).sort((a, b) => (a.name > b.name ? -1 : 1));
  };

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">

</style>