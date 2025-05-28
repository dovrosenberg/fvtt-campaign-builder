<template>
  <TypeAhead 
    :initial-list="validSpecies"
    :initial-value="currentSpeciesId || ''"
    :allow-new-items="props.allowNewItems"
    @selection-made="onSpeciesSelectionMade"
    @item-added="($event) => onSpeciesItemAdded($event as SpeciesSelectOption)"
  />
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, nextTick } from 'vue';

  // local imports
  import { ModuleSettings, SettingKey } from '@/settings';
  
  // library components

  // local components
  import TypeAhead from '@/components/TypeAhead.vue';

  // types
  import { onMounted, onUnmounted } from 'vue';
  type SpeciesSelectOption = { id: string; label: string };

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
    (e: 'speciesSelectionMade', species: SpeciesSelectOption): void;
    (e: 'speciesItemAdded', species: SpeciesSelectOption): void;
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
  const refreshSpeciesList = () => {
    validSpecies.value = ModuleSettings.get(SettingKey.speciesList).map((s) => ({
      id: s.id,
      label: s.name,
    })) || [];
  };

  // Event handler for species list updates
  const handleSpeciesListUpdate = () => {
    refreshSpeciesList();

    // if we changed the one we're on, need to update it
    nextTick(() => {
      currentSpeciesId.value = currentSpeciesId.value;
    });
  };

  // Expose the refresh method so parent components can call it
  defineExpose({
    refreshSpeciesList
  });

  ////////////////////////////////
  // event handlers

/**
 * Handles the event when a species is selected from the list.
 * Emits the 'speciesSelectionMade' event with the selected species ID and its corresponding label.
 *
 * @param {string} speciesId - The ID of the selected species.
 * @returns {Promise<void>} - A promise that resolves when the event has been emitted.
 */
  const onSpeciesSelectionMade = async (speciesId: string): Promise<void> => {
    // we only return valid species descriptions - not newly added ones
    emit('speciesSelectionMade', { id: speciesId, label: validSpecies.value.find(s=>s.id===speciesId)?.label || ''});
  };

  /**
   * Handles the event when a species is added to the list.
   * If allowNewItems is true, adds the new species to the internal list and emits the 'speciesItemAdded' event with the new species.
   * Note that you need to add it to the settings in the parent if desired.
   * 
   * If allowNewItems is false, doesn't add the new species to the internal list and resets the currentSpeciesId to the initialValue.
   *
   * @param {Object} newSpecies - The new species item to add.
   * @param {string} newSpecies.id - The ID of the new species item.
   * @param {string} newSpecies.label - The label of the new species item.
   * @returns {Promise<void>} - A promise that resolves when the event has been emitted.
   */
  const onSpeciesItemAdded = async (newSpecies: SpeciesSelectOption): Promise<void> => {
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
    refreshSpeciesList();

    // Listen for species list updates
    document.addEventListener('fcb-species-list-updated', handleSpeciesListUpdate);
  });

  onUnmounted(() => {
    // Clean up event listener
    document.removeEventListener('fcb-species-list-updated', handleSpeciesListUpdate);
  });

</script>

<style lang="scss">

</style>