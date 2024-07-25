// a typeahead for selecting a parent object
<template>
  <TypeAhead 
    :initial-list="typeList"
    :initial-value="props.initialValue"
    :allow-new-items="false"
    @selection-made="onSelectionMade"
  />
</template>

<script setup lang="ts">
  // library imports
  import { PropType, computed, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore } from '@/applications/stores';
  import { PackFlagKey, PackFlags } from '@/settings/PackFlags';
  import { getGame } from '@/utils/game';
  import { Hierarchy, validParentItems } from '@/utils/hierarchy';

  // library components

  // local components

  // types

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'selectionMade', selectedValue: string): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentEntry, } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const hasFocus = ref<boolean>(false);
  const currentValue = ref<string>('');
  const list = ref<string[]>([]);

  ////////////////////////////////
  // computed data
  const currentHierarchy = computed((): Hierarchy | null => {
    if (!currentEntry.value) 
      return null;

    const packId = currentEntry.value.pack || '';

    return PackFlags.get(packId, PackFlagKey.hierarchies)[currentEntry.value.uuid];
  });
  const validParents = computed((): string[] => {
    if (!currentEntry.value) 
      return [];

    const pack = getGame().packs?.get(currentEntry.value.pack || '');
    return pack ? validParentItems(pack, currentEntry.value) : [];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers
  watch(() => props.initialList, (newList: string[]) => {
    list.value = globalThis.foundry.utils.deepClone(newList) || [];
  });

  watch(() => props.initialValue, (newValue: string) => {
    currentValue.value = newValue;
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    // watch for clicks anywhere outside the control
    document.addEventListener('click', async (event: MouseEvent) => {
      if (hasFocus.value && event.currentTarget && !(event.currentTarget as HTMLElement)?.closest('.fwb-typeahead')) {
        // we were in it, but now we're not; treat as if we'd tabbed out
        await onKeyDown({key:'Tab'} as KeyboardEvent);
      }
    });

    // create our working list
    list.value = globalThis.foundry.utils.deepClone(props.initialList) || [];
    currentValue.value = props.initialValue;
  });


</script>

<style lang="scss">
  .fwb-typeahead {
    position: relative;
    overflow-y: visible;
    z-index: 1000;

    .fwb-ta-dropdown {
      position: absolute;
      margin-top: 2px;
      padding: 0;
      display: flex;
      flex-direction: column;
      box-shadow: 0 0 5px #555555;
      border-radius: 3px;
      width: calc(100% - 2px);
      
      .typeahead-entry {
        background: #99999922;
        padding: 1px 3px;
        margin: 1px 0;
        font-size: 1rem;
        font-weight: normal;
        font-family: Signika, sans-serif;

        &.highlighted {
          background: #55559922;
        }
      }
    }
  }
</style>