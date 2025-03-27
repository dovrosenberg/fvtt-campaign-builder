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
    initialValue: {   // the Id
      type: String,
      required: false,
      default: '',
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'speciesSelectionMade', speciesId: string, speciesName: string): void;
    (e: 'speciesItemAdded', species: { id: string; label:string }): void;
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

  const onSpeciesSelectionMade = async (speciesId: string): Promise<void> => {
    emit('speciesSelectionMade', speciesId, validSpecies.value.find(s=>s.id===speciesId)?.label || '');
  };

  // parameter is the text - you need to add it to the settings in the parent
  //    if desired
  const onSpeciesItemAdded = async (newSpecies: { id: string, label: string}): Promise<void> => {
    if (props.allowNewItems) {
      currentSpeciesId.value = newSpecies.id;

      // add to our internal list
      validSpecies.value.push(newSpecies);

      emit('speciesItemAdded', newSpecies);
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