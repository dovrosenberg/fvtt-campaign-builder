<template>
  <form :class="'flexcol wcb-journal-subsheet ' + topic">
    <div ref="contentRef" class="wcb-sheet-container flexcol">
      <header class="wcb-journal-sheet-header flexrow">
        <ImagePicker
          v-model="entryImg"
          :title="`Select Image for ${currentEntry?.name || 'Entry'}`"
        />        
        <div class="wcb-content-header">
          <h1 class="header-name flexrow">
            <i :class="`fas ${icon} sheet-icon`"></i>
            <InputText
              v-model="name"
              for="wcb-input-name"
              class="wcb-input-name"
              unstyled
              :placeholder="namePlaceholder"
              :pt="{
                root: { class: 'full-height' }
              }"
              @update:model-value="onNameUpdate"
            />
            <button
              class="wcb-generate-button"
              @click="onGenerateButtonClick"
              title="Generate content"
            >
              <i class="fas fa-head-side-virus"></i>
            </button>
          </h1>
          <div class="flexrow form-group">
            <label>{{ localize('labels.fields.type') }}</label>
            <TypeSelect
              :initial-value="currentEntry?.type || ''"
              :topic="topic as ValidTopic"
              @type-selection-made="onTypeSelectionMade"
            />
          </div>

          <!-- show the species for characters -->
          <div 
            v-if="topic===Topics.Character"
            class="flexrow form-group"
          >
            <label>{{ localize('labels.fields.species') }}</label>
            <SpeciesSelect
              :initial-value="currentEntry?.speciesId || ''"
              :allow-new-items="false"
              @species-selection-made="onSpeciesSelectionMade"
            />
          </div>

          <div 
            v-if="showHierarchy"
            class="flexrow form-group"
          >
            <label>{{ localize('labels.fields.parent') }}</label>
            <TypeAhead 
              :initial-list="validParents"
              :initial-value="parentId || ''"
              @selection-made="onParentSelectionMade"
            />
          </div>
        </div>
      </header>
      <nav class="wcb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="description">{{ localize('labels.tabs.entry.description') }}</a>
        <a 
          v-for="relationship in relationships"
          :key="relationship.label"
          class="item" 
          :data-tab="relationship.tab"
        >
          {{ localize(relationship.label) }}
        </a>
        <a 
          v-if="topic===Topics.Character"
          class="item" 
          data-tab="actors"
        >
          {{ localize('labels.tabs.entry.actors') }}
        </a>
        <a 
          v-if="topic===Topics.Location"
          class="item" 
          data-tab="scenes"
        >
          {{ localize('labels.tabs.entry.scenes') }}
        </a>
      </nav>
      <div class="wcb-tab-body flexcol">
        <div class="tab description flexcol" data-group="primary" data-tab="description">
          <div class="tab-inner flexcol">
            <Editor 
              :initial-content="currentEntry?.description || ''"
              :has-button="true"
              @editor-saved="onDescriptionEditorSaved"
            />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="characters">
          <div class="tab-inner flexcol">
            <RelatedItemTable :topic="Topics.Character" />
          </div>
        </div> 
        <div class="tab description flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner flexcol">
            <RelatedItemTable :topic="Topics.Location" />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="organizations">
          <div class="tab-inner flexcol">
            <RelatedItemTable :topic="Topics.Organization" />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="events">
          <div class="tab-inner flexcol">
            <RelatedItemTable :topic="Topics.Event" />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="scenes">
          <div class="tab-inner flexcol">
            <RelatedDocumentTable 
              :document-link-type="DocumentLinkType.Scenes"
            />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="actors">
          <div class="tab-inner flexcol">
            <RelatedDocumentTable 
              :document-link-type="DocumentLinkType.Actors"
            />
          </div>
        </div>
      </div>
    </div>
  </form>
  <GenerateDialog
    v-model="showGenerateCharacter"
    :topic="Topics.Character"
    :initial-name="currentEntry?.name || ''"
    :initial-type="currentEntry?.type || ''"
    :initial-species-id="currentEntry?.speciesId || ''"
    :initial-description="currentEntry?.description ? htmlToPlainText(currentEntry.description) : ''"
    @generation-complete="onCharacterGenerated"
  />
  <GenerateDialog
    v-model="showGenerateLocation"
    :topic="Topics.Location"
    :initial-name="currentEntry?.name || ''"
    :initial-type="currentEntry?.type || ''"
    :valid-parents="validParents"
    :initial-parent-id="parentId || ''"
    :initial-description="currentEntry?.description ? htmlToPlainText(currentEntry.description) : ''"
    @generation-complete="onLocationGenerated"
  />
</template>

<script setup lang="ts">

  // library imports
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTopicIcon, htmlToPlainText } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { hasHierarchy, validParentItems, } from '@/utils/hierarchy';
  import { useTopicDirectoryStore, useMainStore, useNavigationStore, useRelationshipStore, } from '@/applications/stores';
  import { Backend } from '@/classes/Backend';
  import { ModuleSettings, SettingKey } from '@/settings';
  
  // library components
  import InputText from 'primevue/inputtext';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import Editor from '@/components/Editor.vue';
  import TypeAhead from '@/components/TypeAhead.vue';
  import RelatedItemTable from '@/components/ItemTable/RelatedItemTable.vue';
  import RelatedDocumentTable from '@/components/DocumentTable/RelatedDocumentTable.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import GenerateDialog from '@/components/AIGeneration/GenerateDialog.vue';
  import ImagePicker from '@/components/ImagePicker.vue'; 

  // types
  import { DocumentLinkType, Topics, ValidTopic, GeneratedCharacterDetails, Species, GeneratedLocationDetails } from '@/types';
  import { Entry, WBWorld, TopicFolder } from '@/classes';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const topicDirectoryStore = useTopicDirectoryStore();
  const navigationStore = useNavigationStore();
  const relationshipStore = useRelationshipStore();
  const { currentEntry, currentWorld, currentContentTab, refreshCurrentEntry, } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const topicData = {
    [Topics.Character]: { namePlaceholder: 'placeholders.characterName', },
    [Topics.Event]: { namePlaceholder: 'placeholders.characterName', },
    [Topics.Location]: { namePlaceholder: 'placeholders.characterName', },
    [Topics.Organization]: { namePlaceholder: 'placeholders.characterName', },
  };

  const relationships = [
    { tab: 'characters', label: 'labels.tabs.entry.characters', },
    { tab: 'locations', label: 'labels.tabs.entry.locations',},
    { tab: 'organizations', label: 'labels.tabs.entry.organizations', },
    { tab: 'events', label: 'labels.tabs.entry.events', },
  ] as { tab: string; label: string }[];

  const tabs = ref<foundry.applications.ux.Tabs>();
  const topic = ref<Topics | null>(null);
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const parentId = ref<string | null>(null);
  const validParents = ref<{id: string; label: string}[]>([]);
  const showGenerateCharacter = ref<boolean>(false);
  const showGenerateLocation = ref<boolean>(false);
  const isGeneratingImage = ref<boolean>(false); // Flag to track whether image generation is in progress
  const defaultImage = 'icons/svg/mystery-man.svg'; // Default Foundry image
  
  ////////////////////////////////
  // computed data
  const icon = computed((): string => (!topic.value ? '' : getTopicIcon(topic.value)));
  const showHierarchy = computed((): boolean => (topic.value===null ? false : hasHierarchy(topic.value)));
  const namePlaceholder = computed((): string => (topic.value===null ? '' : (localize(topicData[topic.value]?.namePlaceholder || '') || '')));
  const entryImg = computed({
    get: (): string => currentEntry.value?.img || defaultImage,
    set: async (value: string) => {
      if (currentEntry.value) {
        currentEntry.value.img = value;
        await currentEntry.value.save();
      }
    }
  });

  ////////////////////////////////
  // methods
  const refreshEntry = async () => {
    if (!currentEntry.value || !currentEntry.value.uuid) {
      topic.value = null;
    } else {
      let newTopicFolder: TopicFolder | null;

      newTopicFolder = currentEntry.value.topicFolder;
      if (!newTopicFolder) 
        throw new Error('Invalid entry topic in EntryContent.watch-currentEntry');

      // we're going to show a content page
      topic.value = newTopicFolder.topic;

      // load starting data values
      name.value = currentEntry.value.name || '';

      // set the parent and valid parents
      if (currentWorld.value) {    
        parentId.value = await currentEntry.value.getParentId();

        validParents.value = validParentItems(currentWorld.value as WBWorld, currentEntry.value).map((e)=> ({
          id: e.id,
          label: e.name || '',
        }));
      }
    }
  };

  ////////////////////////////////
  // event handlers

  // debounce changes to name
  let debounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      const newValue = newName || '';
      if (currentEntry.value && currentEntry.value.name!==newValue) {
        currentEntry.value.name = newValue;
        await currentEntry.value.save();

        await topicDirectoryStore.refreshTopicDirectoryTree([currentEntry.value.uuid]);
        await navigationStore.propagateNameChange(currentEntry.value.uuid, newValue);
        await relationshipStore.propagateNameChange(currentEntry.value);
      }
    }, debounceTime);
  };

  const onTypeSelectionMade = async (selection: string) => {
    if (currentEntry.value) {
      const oldType = currentEntry.value.type;
      currentEntry.value.type = selection;
      await currentEntry.value.save();

      await topicDirectoryStore.updateEntryType(currentEntry.value, oldType);
    }
  };

  const onParentSelectionMade = async (selection: string): Promise<void> => {
    if (!currentEntry.value?.topic || !currentEntry.value?.uuid)
      return;

    if (!currentEntry.value.topicFolder)
      throw new Error('Invalid topic in EntryContent.onParentSelectionMade()');

    await topicDirectoryStore.setNodeParent(currentEntry.value.topicFolder, currentEntry.value.uuid, selection || null);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentEntry.value)
      return;

    currentEntry.value.description = newContent;
    await currentEntry.value.save();
  };

  const onSpeciesSelectionMade = async (species: {id: string; label: string}): Promise<void> => {
    if (!currentEntry.value?.topic || !currentEntry.value?.uuid)
      return;

    currentEntry.value.speciesId = species.id;
    await currentEntry.value.save();
  };

  const onGenerateButtonClick = (event: MouseEvent): void => {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    if (topic.value !== Topics.Character && topic.value !== Topics.Location) {
      return;
    }

    // Show context menu
    const menuItems = {
      [Topics.Character]: [
        {
          icon: 'fa-file-lines',
          iconFontClass: 'fas',
          label: 'Generate text',
          onClick: () => {
            showGenerateCharacter.value = true;
          }
        },
        {
          icon: 'fa-image',
          iconFontClass: 'fas',
          label: `Generate image ${isGeneratingImage.value ? ' (in progress)' : ''}`,
          disabled: isGeneratingImage.value,
          onClick: async () => {
            await generateCharacterImage();
          }
        },
      ],
      [Topics.Location]: [
      {
          icon: 'fa-file-lines',
          iconFontClass: 'fas',
          label: 'Generate text',
          onClick: () => {
            showGenerateLocation.value = true;
          }
        },
        {
          icon: 'fa-image',
          iconFontClass: 'fas',
          label: `Generate image ${isGeneratingImage.value ? ' (in progress)' : ''}`,
          disabled: isGeneratingImage.value,
          onClick: async () => {
            await generateLocationImage();
          }
        },
      ]
    };

    ContextMenu.showContextMenu({
      customClass: 'wcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: menuItems[topic.value],
    });
  };

  const generateCharacterImage = async (): Promise<void> => {
    if (!currentEntry.value || !currentWorld.value || isGeneratingImage.value || currentEntry.value.topic !== Topics.Character) {
      return;
    }

    try {
      isGeneratingImage.value = true;

      // Show a notification that we're generating an image
      ui.notifications?.info(`Generating image for ${currentEntry.value.name}. This may take a minute...`);

      // Get species name if this is a character
      let species: Species | undefined;
      const speciesList = ModuleSettings.get(SettingKey.speciesList);
      if (currentEntry.value.speciesId) {
        species = speciesList.find(s => s.id === currentEntry.value?.speciesId);
      }

      // Call the API to generate an image
      const result = await Backend.api.apiCharacterGenerateImagePost({
        genre: currentWorld.value.genre,
        worldFeeling: currentWorld.value.worldFeeling,
        type: currentEntry.value.type,
        species: species?.name || '',
        speciesDescription: species?.description || '',
        briefDescription: currentEntry.value.description,
      });

      // Update the entry with the generated image
      if (result.data.filePath) {
        currentEntry.value.img = result.data.filePath;
        await currentEntry.value.save();
      } else {
        throw new Error('Failed to generate image: No image path returned');
      }
    } catch (error) {
      throw new Error(`Failed to generate image: ${(error as Error).message}`);
    } finally {
      isGeneratingImage.value = false;
    }
  };

  const generateLocationImage = async (): Promise<void> => {
    if (!currentEntry.value || !currentWorld.value || isGeneratingImage.value || currentEntry.value.topic !== Topics.Location) {
      return;
    }

    try {
      isGeneratingImage.value = true;

      // Show a notification that we're generating an image
      ui.notifications?.info(`Generating image for ${currentEntry.value.name}. This may take a minute...`);

      // Get species name if this is a character
      let species: Species | undefined;
      const speciesList = ModuleSettings.get(SettingKey.speciesList);
      if (currentEntry.value.speciesId) {
        species = speciesList.find(s => s.id === currentEntry.value?.speciesId);
      }

      // Call the API to generate an image
      const result = await Backend.api.apiLocationGenerateImagePost({
        genre: currentWorld.value.genre,
        worldFeeling: currentWorld.value.worldFeeling,
        type: currentEntry.value.type,
        species: species?.name || '',
        speciesDescription: species?.description || '',
        briefDescription: currentEntry.value.description,
      });

      // Update the entry with the generated image
      if (result.data.filePath) {
        currentEntry.value.img = result.data.filePath;
        await currentEntry.value.save();
      } else {
        throw new Error('Failed to generate image: No image path returned');
      }
    } catch (error) {
      throw new Error(`Failed to generate image: ${(error as Error).message}`);
    } finally {
      isGeneratingImage.value = false;
    }
  };

  const onCharacterGenerated = async (details: GeneratedCharacterDetails) => {
    if (!currentEntry.value) return;

    // Update the entry with the generated content
    currentEntry.value.name = details.name;
    currentEntry.value.description = details.description;
    currentEntry.value.type = details.type;
    if (details.speciesId) {
      currentEntry.value.speciesId = details.speciesId;
    }

    // Save the entry
    await currentEntry.value.save();

    // Update the UI
    name.value = details.name;

    // Refresh the directory tree to show the updated name
    await topicDirectoryStore.refreshTopicDirectoryTree([currentEntry.value.uuid]);
    await navigationStore.propagateNameChange(currentEntry.value.uuid, details.name);
    await relationshipStore.propagateNameChange(currentEntry.value);
  };

  const onLocationGenerated = async (details: GeneratedLocationDetails) => {
    if (!currentEntry.value) return;

    // Update the entry with the generated content
    currentEntry.value.name = details.name;
    currentEntry.value.description = details.description;
    currentEntry.value.type = details.type;
    if (details.parentId) {
      await topicDirectoryStore.setNodeParent(currentEntry.value.topicFolder as TopicFolder, currentEntry.value.uuid, details.parentId || null);
    }

    // Save the entry
    await currentEntry.value.save();

    // Update the UI
    name.value = details.name;

    // Refresh the directory tree to show the updated name
    await topicDirectoryStore.refreshTopicDirectoryTree([currentEntry.value.uuid]);
    await navigationStore.propagateNameChange(currentEntry.value.uuid, details.name);
    await relationshipStore.propagateNameChange(currentEntry.value);
  };

  ////////////////////////////////
  // watchers
  // in case the tab is changed externally
  watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
    if (newTab!==oldTab)
      tabs.value?.activate(newTab || 'description');    
  });

  // see if we want to force a full refresh (ex. when parent changes externally)
  watch(refreshCurrentEntry, async (newValue: boolean): Promise<void> => {
    if (newValue) {
      await refreshEntry();
      refreshCurrentEntry.value = false;
    }
  });
  
  watch(currentEntry, async (newEntry: Entry | null, oldEntry: Entry | null): Promise<void> => {
    await refreshEntry();

    // if we changed entries, reset the tab
    if (newEntry?.uuid!==oldEntry?.uuid )
      currentContentTab.value = 'description';
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    tabs.value = new foundry.applications.ux.Tabs({ navSelector: '.tabs', contentSelector: '.wcb-tab-body', initial: 'description', /*callback: null*/ });

    // update the store when tab changes
    tabs.value.callback = () => {
      currentContentTab.value = tabs.value?.active || null;
    };

    // have to wait until they render
    await nextTick();
    if (contentRef.value)
      tabs.value.bind(contentRef.value);
  });


</script>

<style lang="scss">
</style>