<template>
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
        disable: loading,
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

      <h6>Brief description (optional; use to specify physical features or personality you want included)</h6>
      <Textarea 
        v-model="briefDescription"
        rows="2"
      />
      <hr>
      <div style="overflow: auto; height: 250px; min-height: 250px; max-height: 250px">
        <div v-if="generateError">
          <span style="color: red"><span style="font-weight: bold">There was an error:</span> {{ generateError }}</span>
        </div>
        <div v-else-if="generateComplete">
          <div><span style="font-weight: bold">Generated name:</span> {{ generatedName }}</div>
          <div style="white-space: pre-wrap">
            <span style="font-weight: bold">Generated description:</span> {{ generatedDescription }}
          </div>
        </div>
        <div v-else-if="loading"
          style="display: flex; align-items: center; justify-content: center; vertical-align: middle;"
        >
          <ProgressSpinner />
        </div>
        <div v-else>
          Press generate for results...
        </div>
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
  import ProgressSpinner from 'primevue/progressspinner';
  import Textarea from 'primevue/textarea';

  // local components
  import Dialog from '@/components/Dialog.vue';
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';

  // types
  import { Topics, GeneratedCharacterDetails } from '@/types';

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    initialName: {
      type: String,
      required: false,
      default: '',
    },
    initialType: {
      type: String,
      required: false,
      default: '',
    },
    initialSpeciesId: {
      type: String,
      required: false,
      default: '',
    },
    initialDescription: {
      type: String,
      required: false,
      default: '',
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'characterGenerated', character: GeneratedCharacterDetails): void;
  }>();


  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentWorld } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const show = ref<boolean>(props.modelValue);
  const name = ref<string>(props.initialName);
  const type = ref<string>(props.initialType);
  const speciesId = ref<string>(props.initialSpeciesId);
  const speciesName = ref<string>('');
  const briefDescription = ref<string>(props.initialDescription);
  const generatedName = ref<string>('');
  const generatedDescription = ref<string>('');

  const generateComplete = ref<boolean>(false);
  const loading = ref<boolean>(false);
  const generateError = ref<string>('');

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
    generateError.value = '';
    loading.value = false;
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

  const onSpeciesItemAdded = async (newSpecies: { id: string; label: string }): Promise<void> => {
    speciesId.value = newSpecies.id;
    speciesName.value = newSpecies.label;
  };

  const onGenerateClick = async function() {
    if (!currentWorld.value) 
      return;

    loading.value = true;
    generateComplete.value = false;
    generateError.value = '';

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
      speciesDescription = speciesToUse?.description || '';  // might not be there because could be just added
    }
    
    // pull the other things we need  
    let result: Awaited<ReturnType<typeof Backend.api.apiCharacterGeneratePost>>;
    try {
      result = await Backend.api.apiCharacterGeneratePost({
        genre: currentWorld.value.genre,
        worldFeeling: currentWorld.value.worldFeeling,
        type: type.value,
        species: speciesName.value,
        speciesDescription: speciesDescription,
        name: name.value,
        briefDescription: briefDescription.value,
      });
    } catch (error) {
      generateError.value = (error as Error).message;
      generateComplete.value = true;
      loading.value = false;
      return;
    }

    generatedName.value = result.data.name;
    generatedDescription.value = result.data.description;

    generateComplete.value = true;
    loading.value = false;
  }

  const onAcceptClick = async function() {
    // see if speciesId was made up or is an existing one
    const validSpecies = ModuleSettings.get(SettingKey.speciesList).map((s) => s.id);

    // emit an event that has the new name and description
    emit('characterGenerated', { 
      name: generatedName.value, 
      description: generatedDescription.value,
      type: type.value,
      speciesId: validSpecies.includes(speciesId.value) ? speciesId.value : '',
    });
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
