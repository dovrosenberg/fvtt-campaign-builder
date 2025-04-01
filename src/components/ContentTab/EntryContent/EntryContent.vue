<template>
  <form :class="'flexcol wcb-journal-subsheet ' + topic">
    <div ref="contentRef" class="wcb-sheet-container flexcol">
      <header class="wcb-journal-sheet-header flexrow">
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
              v-if="canGenerate"
              class="wcb-generate-button"
              @click="onGenerateButtonClick"
              :disabled="generateDisabled"
              :title="`${localize('tooltips.generateContent')}${generateDisabled ? ` ${localize('tooltips.backendNotAvailable')}` : ''}`"
            >
              <i class="fas fa-head-side-virus"></i>
            </button>
          </h1>
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
          <div v-if="topic"
            class="tab-inner flexcol"
          >
            <DescriptionTab 
              :valid-parents="validParents"
              :parent-id="parentId || undefined"
              :topic="topic"
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
    v-if="topic"
    v-model="showGenerate"
    :topic="topic"
    :initial-name="currentEntry?.name || ''"
    :initial-type="currentEntry?.type || ''"
    :initial-species-id="currentEntry?.speciesId || ''"
    :valid-parents="validParents"
    :initial-parent-id="parentId || ''"
    :initial-description="currentEntry?.description ? htmlToPlainText(currentEntry.description) : ''"
    @generation-complete="onGenerationComplete"
  />
</template>

<script setup lang="ts">

  // library imports
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTopicIcon, htmlToPlainText } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useTopicDirectoryStore, useMainStore, useNavigationStore, useRelationshipStore, } from '@/applications/stores';
  import { Backend } from '@/classes/Backend';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { validParentItems, } from '@/utils/hierarchy';

  // library components
  import InputText from 'primevue/inputtext';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import DescriptionTab from './DescriptionTab.vue';
  import RelatedItemTable from '@/components/ItemTable/RelatedItemTable.vue';
  import RelatedDocumentTable from '@/components/DocumentTable/RelatedDocumentTable.vue';
  import GenerateDialog from '@/components/AIGeneration/GenerateDialog.vue';

  // types
  import { DocumentLinkType, Topics, GeneratedCharacterDetails, Species, GeneratedLocationDetails, GeneratedOrganizationDetails } from '@/types';
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
  const showGenerate = ref<boolean>(false);
  const isGeneratingImage = ref<boolean>(false); // Flag to track whether image generation is in progress
  
  ////////////////////////////////
  // computed data
  const icon = computed((): string => (!topic.value ? '' : getTopicIcon(topic.value)));
  const namePlaceholder = computed((): string => (topic.value===null ? '' : (localize(topicData[topic.value]?.namePlaceholder || '') || '')));
  const canGenerate = computed(() => topic.value && [Topics.Character, Topics.Location, Topics.Organization].includes(topic.value));
  const generateDisabled = computed(() => !Backend.available);

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

  const onGenerateButtonClick = (event: MouseEvent): void => {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    if (![Topics.Character, Topics.Location, Topics.Organization].includes(topic.value)) {
      return;
    }

    // Show context menu
    const menuItems = [
      {
        icon: 'fa-file-lines',
        iconFontClass: 'fas',
        label: 'Generate text',
        onClick: () => {
          showGenerate.value = true;
        }
      },
      {
        icon: 'fa-image',
        iconFontClass: 'fas',
        label: `Generate image ${isGeneratingImage.value ? ' (in progress)' : ''}`,
        disabled: isGeneratingImage.value,
        onClick: async () => {
          await generateImage();
        }
      },
    ];

    ContextMenu.showContextMenu({
      customClass: 'wcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: menuItems,
    });
  };

  const generateImage = async (): Promise<void> => {
    if (!currentEntry.value || !currentWorld.value || isGeneratingImage.value || ![Topics.Character, Topics.Location, Topics.Organization].includes(currentEntry.value.topic)) {
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

      let result;
      switch (currentEntry.value.topic) {
        case Topics.Character:
          // Call the API to generate an image
           result = await Backend.api.apiCharacterGenerateImagePost({
            genre: currentWorld.value.genre,
            worldFeeling: currentWorld.value.worldFeeling,
            type: currentEntry.value.type,
            species: species?.name || '',
            speciesDescription: species?.description || '',
            briefDescription: currentEntry.value.description,
          });
          break;
        case Topics.Location:
        case Topics.Organization:
          // get parent/grandparent
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

          // Call the API to generate an image
          const options = {
            genre: currentWorld.value.genre,
            worldFeeling: currentWorld.value.worldFeeling,
            type: currentEntry.value.type,
            name: currentEntry.value.name,
            parentName: parent?.name,
            parentType: parent?.type,
            parentDescription: parent?.description,
            grandparentName: grandparent?.name,
            grandparentType: grandparent?.type,
            grandparentDescription: grandparent?.description,
            briefDescription: currentEntry.value.description,
          };

          if (currentEntry.value.topic === Topics.Location)  {
            result = await Backend.api.apiLocationGenerateImagePost(options);
          } else if (currentEntry.value.topic === Topics.Organization) {
            result = await Backend.api.apiOrganizationGenerateImagePost(options);
          }
          break;
      }

      // Update the entry with the generated image
      if (result.data.filePath) {
        currentEntry.value.img = result.data.filePath;
        await currentEntry.value.save();
        ui.notifications?.info(`Image completed for ${currentEntry.value.name}.`);
      } else {
        throw new Error('Failed to generate image: No image path returned');
      }
    } catch (error) {
      throw new Error(`Failed to generate image: ${(error as Error).message}`);
    } finally {
      isGeneratingImage.value = false;
    }
  };


  const onGenerationComplete = async (details: GeneratedCharacterDetails | GeneratedLocationDetails | GeneratedOrganizationDetails) => {
    if (!currentEntry.value) return;

    // Update the entry with the generated content
    currentEntry.value.name = details.name;
    currentEntry.value.description = details.description;
    currentEntry.value.type = details.type;

    // @ts-ignore
    if (details.speciesId) {
      // @ts-ignore
      currentEntry.value.speciesId = details.speciesId;
    }
    // @ts-ignore
    if (details.parentId) {
      // @ts-ignore
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