<template>
  <!-- used to generate a description for an entry-->


  <!-- Need to think this through more - there should be a generate button on related item 
tables - that's to do something from scratch... but how does it deal with things
like parent?

Or can we only generate from the entry dscription screen?  But then you have to create the entry, edit the name and
stuff there and then generate?

Or should it be a right click on a directory topic to generate from there?

Can we create a dialog to handle all those cases?
 -->
<Dialog 
    v-model="show"
    :title="localize('dialogs.generateCharacter.title')"
    :buttons="[
      {
        label: 'Cancel',
        default: false,
        close: true,
        callback: () => { show=false; }
      },
      {
        label: 'Generate',
        default: false,
        close: false,
        callback: onGenerateClick
      },
      {
        label: 'Accept',
        default: false,
        close: true,
        disable: !generateComplete,
        callback: onAcceptClick
      },
    ]"
    @close="onClose"
  >
    <div 
      class="flexcol"
      style="gap: 5px;"
    >
      <h6>Name (if blank, will generate a new one)</h6>
      <InputText
        v-model="name"
        type="text" 
      />

      <h6>Type (If you create a new one, it will be added to the master list)</h6>
      <TypeSelect 
        :initial-value="type"
        :topic="Topics.Character"
        @type-selection-made="onTypeSelectionMade"
      />

      <h6>
        Species (if blank, will use a random one from your world; you can enter
        something custom here and it won't be added to the list; it will be
        passed directly to the AI, so if it's something custom, don't 
        expect much - better to add to the species list first)
      </h6>
      <SpeciesSelect 
        :initial-value="speciesId"
        :allow-new-items="true"
        @species-selection-made="onSpeciesSelectionMade"
        @species-item-added="onSpeciesItemAdded"
      />

      <h6>Brief description (if blank, will generate a new one)</h6>
      <Textarea 
        v-model="briefDescription"
        rows="2"
      />
      <hr>
      <div v-if="generateComplete">
        Generated name: {{ generatedName }}
        Generated description: {{ generatedDescription }}
      </div>
      <div v-else>
        Press generate for results...
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { Backend } from '@/classes/Backend';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import Dialog from '@/components/Dialog.vue';
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';

  // types
  import { Topics, } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits(['update:modelValue']);

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentWorld } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const show = ref<boolean>(props.modelValue);
  const name = ref<string>('');
  const type = ref<string>('');
  const speciesId = ref<string>('');
  const speciesName = ref<string>('');
  const briefDescription = ref<string>('');
  const generateComplete = ref<boolean>(false);
  const generatedName = ref<string>('');
  const generatedDescription = ref<string>('');

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const resetDialog = function() {
    name.value = '';
    type.value = '';
    speciesId.value = '';
    speciesName.value = '';
    briefDescription.value = '';
    generateComplete.value = false;
    show.value = false;
    emit('update:modelValue', false);
  };

  ////////////////////////////////
  // event handlers
  const onTypeSelectionMade = async (newType: string): Promise<void> => {
    type.value = newType;
  };

  const onSpeciesSelectionMade = async (newSpeciesId: string, newSpeciesName: string): Promise<void> => {
    speciesId.value = newSpeciesId;
    speciesName.value = newSpeciesName;
  };

  const onSpeciesItemAdded = async (newName: string): Promise<void> => {
    speciesName.value = newName;
  };

  const onGenerateClick = async function() {
    if (!currentWorld.value) 
      return;

    let speciesDescription = '';

    const speciesList = ModuleSettings.get(SettingKey.speciesList);

    // randomize species if needed
    if (speciesName.value === '') {
      const randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];
      speciesName.value = randomSpecies.name;
    } else if (speciesId.value === '') {
      // custom name
      speciesDescription = '';
    } else {
      const speciesToUse = speciesList.find(s => s.id === speciesId.value);
      speciesDescription = speciesToUse?.description || '';
    }
    
    // pull the other things we need  
    const result = await Backend.api.apiCharacterGeneratePost({
      genre: currentWorld.value.genre,
      worldFeeling: currentWorld.value.worldFeeling,
      type: type.value,
      species: speciesName.value,
      speciesDescription: speciesDescription,
      briefDescription: briefDescription.value,
    });

    generateComplete.value = true;
    generatedName.value = name.value ? name.value : result.data.name;
    generatedDescription.value = result.data.description;
  }

  const onAcceptClick = async function() {
    // emit an event that has the new name and description

    resetDialog();
  };
  
  const onClose = function() {
    resetDialog();
  };
  
  ////////////////////////////////
  // watchers
  // when the addDialog changes state, alert parent (so v-model works)
  watch(() => show, async (newValue) => {
    emit('update:modelValue', newValue);
  });

  // when the prop changes state, update internal value
  watch(() => props.modelValue, async (newValue) => {
    show.value = newValue; 
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
</style>
