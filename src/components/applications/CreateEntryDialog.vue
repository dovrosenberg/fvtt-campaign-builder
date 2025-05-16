<template>
   <Teleport to="body">
    <Dialog 
      v-model="show"
      :title="props.title"
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
          hidden: !Backend.available,
          callback: onGenerateClick
        },
        {
          label: localize('labels.use'),
          default: false,
          close: true,
          disable: !name || (props.generateMode && !generatedDescription),
          callback: onUseClick
        },
      ]"
      @cancel="onCancel"
    >
      <div
        class="flexcol create-entry-dialog-content"
      >
        <h6>
          {{ localize('labels.fields.name')}}
          <i 
            v-if="Backend.available"
            class="fas fa-info-circle tooltip-icon" 
            :data-tooltip="localize('tooltips.createEntry.name')"
          ></i>
        </h6>
        <InputText
          v-model="name"
          type="text"
          :pt="{ root: { style: { 'font-size': 'var(--font-size-14)' }}}"      
        />

        <h6>
          {{ localize('labels.fields.type')}}
          <i 
            class="fas fa-info-circle tooltip-icon" 
            :data-tooltip="localize('tooltips.createEntry.type')"></i>
        </h6>
        <TypeSelect
          :initial-value="type"
          :topic="props.topic"
          @type-selection-made="onTypeSelectionMade"
        />

        <div v-if="props.topic === Topics.Character">
          <h6>
            {{ localize('labels.fields.species')}}
            <i 
              v-if="Backend.available"
              class="fas fa-info-circle tooltip-icon" 
              :data-tooltip="localize('tooltips.createEntry.species')"
            ></i>
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
            <i 
              v-if="Backend.available"
              class="fas fa-info-circle tooltip-icon" 
              :data-tooltip="localize('tooltips.createEntry.parent')"
            ></i>
          </h6>
          <TypeAhead 
            :initial-list="validParents"
            :initial-value="parentId || ''"
            @selection-made="onParentSelectionMade"
          />
        </div>

        <h6>
          {{ Backend.available ? localize('labels.fields.briefDescription') : localize('labels.fields.description') }}
          <i
            v-if="Backend.available" 
            class="fas fa-info-circle tooltip-icon" 
            :data-tooltip="localize('tooltips.createEntry.description')"
          ></i>
        </h6>
        <Textarea
          v-model="briefDescription"
          :pt="{ root: { 
            style: { 
              'font-size': 'var(--font-size-14)', 
              'color': 'var(--input-text-color)',
              'min-height': '6rem',
              'max-height': '6rem',
              'background': !props.generateMode || !generateComplete ? 'rgba(255, 228, 196, .3)' : '',
            }
          }}"
        />
        <div 
          v-if="Backend.available"
          class="generation-option"
        >
          <div class="generation-option-wrapper">
            <Checkbox 
              v-model="longDescriptions" 
              :binary="true"
              inputId="long-description-checkbox"
            />
            <label for="long-description-checkbox" class="generation-label">
              {{ localize('labels.fields.longDescriptions') }}
              <i class="fas fa-info-circle tooltip-icon" :data-tooltip="localize('tooltips.createEntry.longDescriptions')"></i>
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
              <i class="fas fa-info-circle tooltip-icon" :data-tooltip="localize('tooltips.createEntry.generateImage')"></i>
            </label>
          </div>
        </div>

        <!-- Add new checkbox for adding to current session -->
        <div 
          v-if="isInPlayMode"
          class="generation-option"
        >
          <div class="generation-option-wrapper">
            <Checkbox 
              v-model="addToCurrentSession" 
              :binary="true"
              inputId="add-to-session-checkbox"
            />
            <label for="add-to-session-checkbox" class="generation-label">
              {{ localize('labels.fields.addToCurrentSession') }}
              <i class="fas fa-info-circle tooltip-icon" :data-tooltip="localize('tooltips.createEntry.addToCurrentSession')"></i>
            </label>
          </div>
        </div>

        <hr 
          v-if="Backend.available"
          style="background-image: none; border: 1px solid #aaa"          
        >
        <div 
          v-if="Backend.available"
          class="results-container"
        >
          <div v-if="generateError" class="error-message">
            <span class="error-label">{{ localize('dialogs.generateNameDialog.errorMessage') }}</span> {{ generateError }}
          </div>
          <div v-else-if="generateComplete" class="generated-content" style="background: rgba(255, 228, 196, .3)">
            <div><span class="label">{{ localize('dialogs.createEntry.generatedName')}}:</span> {{ generatedName }}</div>
            <div class="description">
              <p><span class="label">{{ localize('dialogs.createEntry.generatedDescription')}}:</span></p>
              {{ generatedDescription }}
            </div>
          </div>
          <div v-else-if="loading" class="loading-container">
            <ProgressSpinner />
          </div>
          <div v-else class="prompt-message">
            {{ localize('dialogs.createEntry.generatePrompt')}}...<br/><br/>
            {{ props.generateMode ? '' : localize('dialogs.createEntry.generatePrompt2')}}
          </div>
        </div>
      </div>
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted, PropType, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useSessionStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { Backend } from '@/classes';
  import { generatedTextToHTML, htmlToPlainText } from '@/utils/misc';
  import { hasHierarchy, } from '@/utils/hierarchy';
  
  // library components
  import InputText from 'primevue/inputtext';
  import ProgressSpinner from 'primevue/progressspinner';
  import Textarea from 'primevue/textarea';
  import Checkbox from 'primevue/checkbox';
  
  // local components
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';
  import TypeAhead from '@/components/TypeAhead.vue'; 
  import Dialog from '@/components/Dialog.vue';

  // types
  import { Topics, ValidTopic, Species, CharacterDetails, LocationDetails, OrganizationDetails } from '@/types';
  import { Entry } from '@/classes';

  ////////////////////////////////
  // props
  const props = defineProps({
    title: {
      type: String,
      required: true,
    },
    /** this is used to edit records that already exist */
    generateMode: {
      type: Boolean,
      required: false,
      default: false,
    },
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
    callback: {
      type: Function as PropType<(details: CharacterDetails | LocationDetails | OrganizationDetails | null) => void>,
      required: false,
    },
  });

  ////////////////////////////////
  // emits


  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const sessionStore = useSessionStore();
  const { currentWorld, isInPlayMode } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const name = ref<string>(props.initialName);
  const type = ref<string>(props.initialType);
  const briefDescription = ref<string>('');
  const generatedName = ref<string>('');
  const generatedDescription = ref<string>('');
  const generateComplete = ref<boolean>(false);
  const loading = ref<boolean>(false);
  const generateError = ref<string>('');
  const generateImageAfterAccept = ref<boolean>(false);
  const longDescriptions = ref<boolean>(true);
  const show = ref<boolean>(true);
  
  // for characters
  const speciesId = ref<string>(props.initialSpeciesId);
  const speciesName = ref<string>('');

  // for locations/organizations
  const parentId = ref<string>(props.initialParentId);
  const parentName = ref<string>('');

  // Add new checkbox for adding to current session
  const addToCurrentSession = ref<boolean>(ModuleSettings.get(SettingKey.defaultAddToSession));

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

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
    if (!currentWorld.value)
      return;

    // create the entry and kick off image generation if needed
    // if we haven't generated a description, use whatever's in brief description
    // the idea is that - especially when we're dealing with a rolltable name - user can use this form as a sort of quick create
    let details: CharacterDetails | LocationDetails | OrganizationDetails | null = null;
    if (props.topic === Topics.Character) {
      // see if speciesId was made up or is an existing one
      const validSpecies = ModuleSettings.get(SettingKey.speciesList).map((s) => s.id);

      details = {
        name: generateComplete.value ? generatedName.value : name.value,
        type: type.value,
        description: generateComplete.value ? generatedTextToHTML(generatedDescription.value) : briefDescription.value,
        speciesId: validSpecies.includes(speciesId.value) ? speciesId.value : '',
        generateImage: generateImageAfterAccept.value
      }
    } else if (props.topic === Topics.Location || props.topic === Topics.Organization) {
      details = {
        name: generateComplete.value ? generatedName.value : name.value,
        type: type.value,
        parentId: parentId.value,
        description: generateComplete.value ? generatedTextToHTML(generatedDescription.value) : briefDescription.value,
        generateImage: generateImageAfterAccept.value
      }
    }

    // Call the callback with the created entry if it exists
    if (props.callback) {
      const entry = await props.callback(details);

      // If we're in play mode and the checkbox is checked, add to current session
      if (isInPlayMode.value && addToCurrentSession.value && entry) {
        if (props.topic === Topics.Character) {
          await sessionStore.addNPC(entry.uuid);
        } else if (props.topic === Topics.Location) {
          await sessionStore.addLocation(entry.uuid);
        } else if (props.topic === Topics.Organization) {
          // For organizations, do nothing for now 
          // TODO: maybe add to the notes; have to figure out how to deal with open editors
        }
      }
    }
  };
  
  const onCancel = function() {
    // Call the callback with null to indicate cancellation
    if (props.callback) {
      props.callback(null);
    }
  };
  
  ////////////////////////////////
  // watchers
  // 
  // when the prop changes state, update internal value
  watch(() => props.initialName, () => {
    name.value = props.initialName;
  });
  watch(() => props.initialType, () => {
    type.value = props.initialType;
  }
  );
  watch(() => props.initialSpeciesId, () => {
    speciesId.value = props.initialSpeciesId;

    // Set the species name if we have a species ID
    if (props.initialSpeciesId) {
      const speciesList = ModuleSettings.get(SettingKey.speciesList);
      const species = speciesList.find(s => s.id === props.initialSpeciesId);
      speciesName.value = species?.name || '';
    } else {
      speciesName.value = '';
    }
  });
  watch(() => props.initialParentId, () => {
    // Set the parent name if we have a parent ID
    if (props.initialParentId) {
      parentName.value = props.validParents.find(p => p.id === props.initialParentId)?.label || '';
    } else {
      parentName.value = '';
    }
  });
  watch(() => props.initialDescription, (newValue) => {
    briefDescription.value = htmlToPlainText(newValue);
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
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

    longDescriptions.value = ModuleSettings.get(SettingKey.defaultToLongDescriptions);
    briefDescription.value = htmlToPlainText(props.initialDescription);
    generateComplete.value = false;
    generateError.value = '';
    loading.value = false;
  });

</script>

<style lang="scss">
  .application.fcb-create-entry {
    // hide the wrapper window
    display:none;
  }
  
  // Ensure dialog is always on top of Foundry UI
  body > .fcb-dialog {
    z-index: 9999 !important;
  }

  .create-entry-dialog-content {
    h6 {
      display: flex;
      margin-bottom: 2px;
      margin-top: 8px;
      align-items: center;
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

    .tooltip-icon {
      margin-left: 5px;
      font-size: 12px;
      color: #888;
      cursor: help;

      &:hover {
        color: #555;
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
        color: var(--fcb-color-text-generate-message);
        margin-top: 100px;
        font-style: italic;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
      }
    }
  }
</style>
