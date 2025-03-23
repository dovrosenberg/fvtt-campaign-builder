<template>
  <TypeAhead 
    :initial-list="validSpecies"
    :initial-value="currentSpeciesId || ''"
    :allow-new-items="props.allowNewItems"
    @selection-made="onSpeciesSelectionMade"
    @item-added="onSpeciesItemAdded"
  />
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, } from 'vue';

  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  
  // library components

  // local components
  import TypeAhead from '@/components/TypeAhead.vue';

  // types
  import { onMounted } from 'vue';

  ////////////////////////////////
  // props
  const props = defineProps({
    allowNewItems: {
      type: Boolean,
      required: false,
      default: false,
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
    (e: 'speciesSelectionMade', speciesId: string): void;
    (e: 'speciesItemAdded', speciesId: string): void;
  }>();

  ////////////////////////////////
  // store
  
  ////////////////////////////////
  // data
  const validSpecies = ref<{id: string; label: string}[]>([]);
  const currentSpeciesId = ref<string>('');

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  const onSpeciesSelectionMade = async (selection: string): Promise<void> => {
    emit('speciesSelectionMade', selection);
  };

  // can't add new ones - just reset
  const onSpeciesItemAdded = async (selection: string): Promise<void> => {
    if (props.allowNewItems) {
      emit('speciesItemAdded', selection);
    } else {
      // can't add - just reset
      currentSpeciesId.value = props.initialValue;      
    }
  };


  ////////////////////////////////
  // watchers
  watch(() => props.initialValue, async (): Promise<void> => {
    currentSpeciesId.value = props.initialValue;    
  })

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    currentSpeciesId.value = props.initialValue;

    // load the species list
    validSpecies.value = ModuleSettings.get(SettingKey.speciesList).map((s) => ({
      id: s.id,
      label: s.name,
    })) || [];
  });


</script>

<style lang="scss">

</style>