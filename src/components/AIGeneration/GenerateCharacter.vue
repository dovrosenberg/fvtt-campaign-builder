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
      class="flexcol generate-character-dialog"
    >
      <h6>
        Name
        <i class="fas fa-info-circle tooltip-icon" data-tooltip="If left blank, a name will be generated automatically"></i>
      </h6>
      <InputText
        v-model="name"
        type="text"
        :pt="{ root: { style: { 'font-size': 'var(--font-size-14)' }}}"      
      />

      <h6>
        Type
        <i class="fas fa-info-circle tooltip-icon" data-tooltip="If you create a new type, it will be added to the master list"></i>
      </h6>
      <TypeSelect
        :initial-value="type"
        :topic="Topics.Character"
        @type-selection-made="onTypeSelectionMade"
      />

      <h6>
        Species
        <i class="fas fa-info-circle tooltip-icon" data-tooltip="If blank, a random species from your world will be used. Custom entries will be passed to the AI but not added to your species list"></i>
      </h6>
      <SpeciesSelect
        :initial-value="speciesId"
        :allow-new-items="true"
        @species-selection-made="onSpeciesSelectionMade"
        @species-item-added="onSpeciesItemAdded"
      />

      <h6>
        Brief description
        <i class="fas fa-info-circle tooltip-icon" data-tooltip="Optional. Use to specify physical features or personality traits you want included"></i>
      </h6>
      <Textarea
        v-model="briefDescription"
        :rows="4"
        autoResize
        :pt="{ root: { style: { 'font-size': 'var(--font-size-14)', 'min-height': '6rem' }}}"
      />
      <hr>
      <div class="results-container">
        <div v-if="generateError" class="error-message">
          <span class="error-label">There was an error:</span> {{ generateError }}
        </div>
        <div v-else-if="generateComplete" class="generated-content">
          <div><span class="label">Generated name:</span> {{ generatedName }}</div>
          <div class="description">
            <span class="label">Generated description:</span> {{ generatedDescription }}
          </div>
        </div>
        <div v-else-if="loading" class="loading-container">
          <ProgressSpinner />
        </div>
        <div v-else class="prompt-message">
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
  import { generatedTextToHTML } from '@/utils/misc';
    
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
    // Just close the dialog without clearing values
    // Values will be updated when the dialog is opened again
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

  const onSpeciesSelectionMade = async (species: { id: string; label: string },): Promise<void> => {
    speciesId.value = species.id;
    speciesName.value = species.label;
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
      description: generatedTextToHTML(generatedDescription.value),
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

    // If the dialog is being opened, update the values from props
    if (newValue) {
      name.value = props.initialName;
      type.value = props.initialType;
      speciesId.value = props.initialSpeciesId;

      // Set the species name if we have a species ID
      if (props.initialSpeciesId) {
        const speciesList = ModuleSettings.get(SettingKey.speciesList);
        const species = speciesList.find(s => s.id === props.initialSpeciesId);
        speciesName.value = species?.name || '';
      } else {
        speciesName.value = '';
      }

      briefDescription.value = props.initialDescription;
      generateComplete.value = false;
      generateError.value = '';
      loading.value = false;
    }
  });

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss" scoped>
.generate-character-dialog {
  h6 {
    margin-bottom: 2px;
    margin-top: 8px;
    display: flex;
    align-items: center;

    &:first-child {
      margin-top: 0;
    }

    .tooltip-icon {
      margin-left: 5px;
      font-size: 12px;
      color: #888;
      cursor: help;

      &:hover {
        color: #555;
      }
    }
  }

  .p-inputtext, .p-dropdown {
    margin-bottom: 4px;
  }

  .results-container {
    overflow: auto;
    height: 250px;
    min-height: 250px;
    max-height: 250px;
    margin-top: 4px;

    .error-message {
      color: red;

      .error-label {
        font-weight: bold;
      }
    }

    .prompt-message {
      text-align: center;
      color: var(--color-text-dark-secondary);
      margin-top: 100px;
      font-style: italic;
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .generated-content {
      .label {
        font-weight: bold;
        margin-right: 4px;
      }

      .description {
        white-space: pre-wrap;
        margin-top: 8px;
      }
    }
  }
}
</style>
