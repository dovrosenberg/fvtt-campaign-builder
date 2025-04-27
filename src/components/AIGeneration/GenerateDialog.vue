<template>
  <Dialog 
    v-model="show"
    :title="localize(titles[props.topic])"
    :buttons="[
      {
        label: localize('labels.cancel'),
        default: false,
        close: true,
        callback: () => { show=false; }
      },
      {
        label: localize('labels.generate'),
        default: false,
        close: false,
        disable: loading,
        callback: onGenerateClick
      },
      {
        label: localize('labels.use'),
        default: false,
        close: true,
        callback: onUseClick
      },
    ]"
    @cancel="onCancel"
  >
    <div
      class="flexcol generate-dialog"
    >
      <h6>
        {{ localize('labels.fields.name')}}
        <i class="fas fa-info-circle tooltip-icon" data-tooltip="If left blank, a name will be generated automatically"></i>
      </h6>
      <InputText
        v-model="name"
        type="text"
        :pt="{ root: { style: { 'font-size': 'var(--font-size-14)' }}}"      
      />

      <h6>
        {{ localize('labels.fields.type')}}
        <i class="fas fa-info-circle tooltip-icon" data-tooltip="If you create a new type, it will be added to the master list"></i>
      </h6>
      <TypeSelect
        :initial-value="type"
        :topic="props.topic"
        @type-selection-made="onTypeSelectionMade"
      />

      <div v-if="props.topic === Topics.Character">
        <h6>
          {{ localize('labels.fields.species')}}
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
          {{ localize('labels.fields.parent')}}
          <i class="fas fa-info-circle tooltip-icon" data-tooltip="If you set the parent, it will save the new value. May influence generated text in some cases"></i>
        </h6>
        <TypeAhead 
          :initial-list="validParents"
          :initial-value="parentId || ''"
          @selection-made="onParentSelectionMade"
        />
      </div>

      <h6>
        {{ localize('labels.fields.briefDescription')}}
        <i class="fas fa-info-circle tooltip-icon" data-tooltip="Optional. Use to specify physical features or personality traits you want included"></i>
      </h6>
      <Textarea
        v-model="briefDescription"
        :rows="4"
        autoResize
        :pt="{ root: { style: { 'font-size': 'var(--font-size-14)', 'min-height': '6rem' }}}"
      />
      <div class="generation-option">
        <div class="generation-option-wrapper">
          <Checkbox 
            v-model="longDescriptions" 
            :binary="true"
            inputId="long-description-checkbox"
          />
          <label for="long-description-checkbox" class="generation-label">
            {{ localize('labels.fields.longDescriptions') }}
            <i class="fas fa-info-circle tooltip-icon" :data-tooltip="localize('tooltips.longDescriptions')"></i>
          </label>
        </div>
        <div class="generation-option-wrapper" style="margin-left: 20px">
          <Checkbox 
            v-model="generateImageAfterAccept" 
            :binary="true"
            inputId="generate-image-checkbox"
          />
          <label for="generate-image-checkbox" class="generation-label">
            {{ localize('labels.fields.generateImage') }}
            <i class="fas fa-info-circle tooltip-icon" :data-tooltip="localize('tooltips.generateImage')"></i>
          </label>
        </div>
      </div>
      <hr>
      <div class="results-container">
        <div v-if="generateError" class="error-message">
          <span class="error-label">{{ localize('dialogs.generateNameDialog.errorMessage') }}</span> {{ generateError }}
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
  import { Backend } from '@/classes';
  import { generatedTextToHTML } from '@/utils/misc';
  import { hasHierarchy, } from '@/utils/hierarchy';
    
  // library components
  import InputText from 'primevue/inputtext';
  import ProgressSpinner from 'primevue/progressspinner';
  import Textarea from 'primevue/textarea';
  import Checkbox from 'primevue/checkbox';

  // local components
  import Dialog from '@/components/Dialog.vue';
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';
  import TypeAhead from '@/components/TypeAhead.vue'; 

  // types
  import { Topics, GeneratedCharacterDetails, GeneratedLocationDetails, GeneratedOrganizationDetails, ValidTopic, Species } from '@/types';
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
    (e: 'generationComplete', results: GeneratedCharacterDetails | GeneratedLocationDetails | GeneratedOrganizationDetails, generateImage: boolean) : void;
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
  const generateImageAfterAccept = ref<boolean>(false);
  const longDescriptions = ref<boolean>(true);

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
    generateImageAfterAccept.value = false;
    show.value = false;
    longDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
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

    if (props.topic === Topics.Character) {
      let speciesDescription = '';
      const speciesList = ModuleSettings.get(SettingKey.speciesList);

      // randomize species if needed
      let randomSpecies: Species | null = null;
      if (speciesName.value === '') {
        randomSpecies = speciesList[Math.floor(Math.random() * speciesList.length)];
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
        let result: Awaited<ReturnType<typeof Backend.api.apiCharacterGeneratePost>>;

        result = await Backend.api.apiCharacterGeneratePost({
          genre: currentWorld.value.genre,
          worldFeeling: currentWorld.value.worldFeeling,
          type: type.value,
          species: speciesName.value,
          speciesDescription: speciesDescription,
          name: name.value,
          briefDescription: briefDescription.value,
          createLongDescription: longDescriptions.value,
        });

        generatedName.value = result.data.name;
        generatedDescription.value = result.data.description;
        
        // also fill into the name block
        name.value = result.data.name;

        // apply the species here if needed - we don't do it above because it makes the species show up before the
        //    generation happens, which looks weird
        if (randomSpecies)
          speciesId.value = randomSpecies.id;
      } catch (error) {
        generateError.value = (error as Error).message;
        generateComplete.value = true;
        loading.value = false;
        return;
      }
    } else if (props.topic === Topics.Location || props.topic === Topics.Organization) {
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
        const options = {
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
          createLongDescription: longDescriptions.value,
        };

        let result: Awaited<ReturnType<typeof Backend.api.apiOrganizationGeneratePost | typeof Backend.api.apiLocationGeneratePost>>;
        if (props.topic === Topics.Location)
          result = await Backend.api.apiLocationGeneratePost(options);
        else 
          result = await Backend.api.apiOrganizationGeneratePost(options);
          
        generatedName.value = result.data.name;
        generatedDescription.value = result.data.description;

        // also fill into the name block
        name.value = result.data.name;
      } catch (error) {
        generateError.value = (error as Error).message;
        generateComplete.value = true;
        loading.value = false;
        return;
      }    
    } else {
      generateComplete.value = true;
      loading.value = false;
      return;
    }
    
    generateComplete.value = true;
    loading.value = false;
  }

  const onUseClick = async function() {
    // see if speciesId was made up or is an existing one
    const validSpecies = ModuleSettings.get(SettingKey.speciesList).map((s) => s.id);

    // emit an event that has the new name and description
    // if we haven't generated a description, use whatever's in brief description
    // the idea is that - especially when we're dealing with a rolltable name - user can use this form as a sort of
    //    quick create
    if (props.topic === Topics.Character) {
      emit('generationComplete', { 
        name: generateComplete.value ? generatedName.value : name.value,
        description: generateComplete.value ? generatedTextToHTML(generatedDescription.value) : briefDescription.value,
        type: type.value,
        speciesId: validSpecies.includes(speciesId.value) ? speciesId.value : '',
      }, generateImageAfterAccept.value);
    } else if (props.topic === Topics.Location || props.topic === Topics.Organization) {
      emit('generationComplete', { 
        name: generateComplete.value ? generatedName.value : name.value,
        description: generateComplete.value ? generatedTextToHTML(generatedDescription.value) : briefDescription.value,
        type: type.value,
        parentId: parentId.value,
      }, generateImageAfterAccept.value);
    }

    resetDialog();
  };
  
  const onCancel = function() {
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
      longDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
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

  .p-inputtext, .p-dropdown {
    margin-bottom: 4px;
  }

  .generation-option {
      display: flex;
      align-items: center;
      flex-direction: row;
      margin-top: 16px;
      padding: 8px 0 8px 0;
      // border-top: 1px solid rgba(0, 0, 0, 0.1);

      .generation-option-wrapper {
        width: 50%;
        display: flex;

        .generation-label {
          margin-left: 8px;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
        }
        }
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
