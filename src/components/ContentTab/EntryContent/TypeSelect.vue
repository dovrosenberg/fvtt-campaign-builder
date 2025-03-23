<template>
  <TypeAhead 
    :initial-list="typeList"
    :initial-value="currentType as string || ''"
    @item-added="onTypeItemAdded"
    @selection-made="onTypeSelectionMade"
  />
</template>

<script setup lang="ts">
  // library imports
  import { PropType, ref, watch, onMounted, computed } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  
  // library components

  // local components
  import TypeAhead from '@/components/TypeAhead.vue';
  import { useMainStore } from '@/applications/stores';

  // types
  import { ValidTopic } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    topic: {
      type: Number as PropType<ValidTopic>,
      required: true,
    },
    initialValue: {
      type: String,
      required: false,
      default: '',
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'typeSelectionMade', type: string): void;
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentWorld, } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const currentType = ref<string>('');

  ////////////////////////////////
  // computed data
  const typeList = computed((): string[] => (props.topic===null || !currentWorld.value ? [] : currentWorld.value.topicFolders[props.topic].types));

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  const onTypeSelectionMade = async (selection: string): Promise<void> => {
    emit('typeSelectionMade', selection);
  };

  // new type added in the typeahead
  const onTypeItemAdded = async (added: string) => {
    if (props.topic === null || !currentWorld.value)
      return;

    const topicFolder = currentWorld.value.topicFolders[props.topic as ValidTopic];
    const currentTypes = topicFolder.types;

    // if not a duplicate, add to the valid type lists 
    if (!currentTypes[props.topic]?.includes(added)) {
      const updatedTypes = currentTypes.concat(added);

      topicFolder.types = updatedTypes;
      await topicFolder.save();
    }

    currentType.value = added;
    await onTypeSelectionMade(added);
  };

  ////////////////////////////////
  // watchers
  watch(() => props.initialValue, async (): Promise<void> => {
    currentType.value = props.initialValue;    
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    currentType.value = props.initialValue;
  });


</script>

<style lang="scss">

</style>