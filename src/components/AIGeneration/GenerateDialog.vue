<template>
  <Dialog 
    v-model="show"
    :title="localize(titles[props.topic])"
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
      class="flexcol generate-dialog"
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
        :topic="props.topic"
        @type-selection-made="onTypeSelectionMade"
      />

      <div v-if="props.topic === Topics.Character">
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
      </div>
      <div v-else-if="hasHierarchy(props.topic)">
        <h6>
          Parent
          <i class="fas fa-info-circle tooltip-icon" data-tooltip="If you set the parent, it will save the new value. May influence generated text in some cases"></i>
        </h6>
        <TypeAhead 
          :initial-list="validParents"
          :initial-value="parentId || ''"
          @selection-made="onParentSelectionMade"
        />
      </div>

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
  import { ref, watch, PropType } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { Backend } from '@/classes/Backend';
  import { generatedTextToHTML } from '@/utils/misc';
  import { hasHierarchy, } from '@/utils/hierarchy';
    
  // library components
  import InputText from 'primevue/inputtext';
  import ProgressSpinner from 'primevue/progressspinner';
  import Textarea from 'primevue/textarea';

  // local components
  import Dialog from '@/components/Dialog.vue';
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';
  import TypeAhead from '@/components/TypeAhead.vue'; 

  // types
  import { Topics, GeneratedCharacterDetails, GeneratedLocationDetails, ValidTopic } from '@/types';
  import { Entry } from '@/classes';

  ////////////////////////////////
  // props
  const props = defineProps({
    modelValue: Boolean,  // show/hide dialog
    topic: {
      type: Number as PropType<ValidTopic>,
      required: true,
    },
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
    validParents: {
      type: Array as PropType<{id: string; label: string}[]>,
      required: false,
      default: '',
    },
    initialParentId: {
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
    (e: 'generationComplete', results: GeneratedCharacterDetails | GeneratedLocationDetails): void;
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
  const briefDescription = ref<string>(props.initialDescription);
  const generatedName = ref<string>('');
  const generatedDescription = ref<string>('');
  const generateComplete = ref<boolean>(false);
  const loading = ref<boolean>(false);
  const generateError = ref<string>('');

  // for characters
  const speciesId = ref<string>(props.initialSpeciesId);
  const speciesName = ref<string>('');

  // for locations/organizations
  const parentId = ref<string>(props.initialParentId);
  const parentName = ref<string>('');

  const titles = {
    [Topics.Character]: 'dialogs.generateCharacter.title',
    [Topics.Location]: 'dialogs.generateLocation.title',
    [Topics.Organization]: 'dialogs.generateOrganization.title',
  }

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

  const onParentSelectionMade = async (id: string, label?: string | undefined): Promise<void> => {
    parentId.value = id;
    parentName.value = label || '';
  };

  const onGenerateClick = async function() {
    if (!currentWorld.value) 
      return;

    loading.value = true;
    generateComplete.value = false;
    generateError.value = '';

    let result: Awaited<ReturnType<
      typeof Backend.api.apiCharacterGeneratePost |
      typeof Backend.api.apiLocationGeneratePost |
      typeof Backend.api.apiOrganizationGeneratePost 
    >>;

    if (props.topic === Topics.Character) {
      let speciesDescription = '';
      const speciesList = ModuleSettings.get(SettingKey.speciesList);

      // randomize species if needed
      if (speciesName.value === '') {
        const randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];
        speciesName.value = randomSpecies.name;
      }
      
      if (speciesName.value === '') {
        // didn't find it - must be a custom name
        speciesDescription = '';
      } else {
        const speciesToUse = speciesList.find(s => s.id === speciesId.value);
        speciesDescription = speciesToUse?.description || '';  // might not be there because could be just added
      }

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
    } else if (props.topic === Topics.Location) {
      let parent: Entry | null = null;
      let grandparent: Entry | null = null;

      if (parentId.value) {
        parent = await Entry.fromUuid(parentId.value);

        if (parent) {
          const grandparentId = await parent.getParentId();
          if (grandparentId) {
            grandparent = await Entry.fromUuid(grandparentId);
          }
        }
      }
      
      // pull the other things we need  
      try {
        result = await Backend.api.apiLocationGeneratePost({
          genre: currentWorld.value.genre,
          worldFeeling: currentWorld.value.worldFeeling,
          type: type.value,
          parentName: parent?.name || '',
          parentType: parent?.type || '',
          parentDescription: parent?.description || '',
          grandparentName: grandparent?.name || '',
          grandparentType: grandparent?.type || '',
          grandparentDescription: grandparent?.description || '',
          name: name.value,
          briefDescription: briefDescription.value,
        });
      } catch (error) {
        generateError.value = (error as Error).message;
        generateComplete.value = true;
        loading.value = false;
        return;
      }    
    // } else if (props.topic === Topics.Organization) {
      
    } else {
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
    if (props.topic === Topics.Character) {
      emit('generationComplete', { 
        name: generatedName.value, 
        description: generatedTextToHTML(generatedDescription.value),
        type: type.value,
        speciesId: validSpecies.includes(speciesId.value) ? speciesId.value : '',
      });
    } else if (props.topic === Topics.Location) {
      emit('generationComplete', { 
        name: generatedName.value, 
        description: generatedTextToHTML(generatedDescription.value),
        type: type.value,
        parentId: parentId.value,
      });
      
    // } else if (props.topic === Topics.Organization) {      
    }

    resetDialog();
  };
  
  const onClose = function() {
    resetDialog();
  };
  
  ////////////////////////////////
  // watchers
  // when the addDialog changes state, alert parent (so v-model works)
  watch(() => show.value, async (newValue) => {
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
      parentId.value = props.initialParentId;

      // Set the species name if we have a species ID
      if (props.initialSpeciesId) {
        const speciesList = ModuleSettings.get(SettingKey.speciesList);
        const species = speciesList.find(s => s.id === props.initialSpeciesId);
        speciesName.value = species?.name || '';
      } else {
        speciesName.value = '';
      }

      // Set the parent name if we have a parent ID
      if (props.initialParentId) {
        parentName.value = props.validParents.find(p => p.id === props.initialParentId)?.label || '';
      } else {
        parentName.value = '';
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
.generate-dialog {
  h6 {
    margin-bottom: 2px;
    margin-top: 8px;
    display: flex;
    align-items: center;

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
