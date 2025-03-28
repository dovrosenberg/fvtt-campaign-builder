<template>
  <form class="'flexcol wcb-journal-subsheet ' + topic">
    <div ref="contentRef" class="wcb-sheet-container flexcol">
      <header class="wcb-journal-sheet-header flexrow">
        <div class="sheet-image">
          <!-- <img class="profile nopopout" src="{{data.src}}" data-edit="src" onerror="if (!this.imgerr) { this.imgerr = true; this.src = 'modules/monks-enhanced-journal/assets/person.png' }"> -->
        </div>
        <div class="header-details wcb-content-header">
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
          <div class="form-group wcb-content-header">
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
            class="form-group wcb-content-header"
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
            class="form-group wcb-content-header"
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
  <GenerateCharacter
    v-model="showGenerateCharacter"
    :initial-name="currentEntry?.name || ''"
    :initial-type="currentEntry?.type || ''"
    :initial-species-id="currentEntry?.speciesId || ''"
    :initial-description="currentEntry?.description ? htmlToPlainText(currentEntry.description) : ''"
    @character-generated="onCharacterGenerated"
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
  import GenerateCharacter from '@/components/AIGeneration/GenerateCharacter.vue';

  // types
  import { DocumentLinkType, Topics, ValidTopic, GeneratedCharacterDetails } from '@/types';
  import { Entry, WBWorld, TopicFolder } from '@/classes';

  // Declare the Tabs class from Foundry VTT global
  declare global {
    class Tabs {
      constructor(options: {
        navSelector: string;
        contentSelector: string;
        initial: string;
        callback?: () => void;
      });
      bind(element: HTMLElement): void;
      activate(tabName: string): void;
      callback?: () => void;
      active: string | null;
    }
  }

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

  const tabs = ref<Tabs>();
  const topic = ref<Topics | null>(null);
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const parentId = ref<string | null>(null);
  const validParents = ref<{id: string; label: string}[]>([]);
  const showGenerateCharacter = ref<boolean>(false);

  ////////////////////////////////
  // computed data
  const icon = computed((): string => (!topic.value ? '' : getTopicIcon(topic.value)));
  const showHierarchy = computed((): boolean => (topic.value===null ? false : hasHierarchy(topic.value)));
  const namePlaceholder = computed((): string => (topic.value===null ? '' : (localize(topicData[topic.value]?.namePlaceholder || '') || '')));

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
        parentId.value = currentWorld.value.getEntryHierarchy(currentEntry.value.uuid)?.parentId || null;

        validParents.value = validParentItems(currentWorld.value as WBWorld, newTopicFolder, currentEntry.value).map((e)=> ({
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

    // Show context menu
    ContextMenu.showContextMenu({
      customClass: 'wcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
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
          label: 'Generate image',
          onClick: () => {
            // TODO: Implement image generation functionality
            console.log('Generate image clicked');
          }
        },
      ]
    });
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
    tabs.value = new Tabs({ navSelector: '.tabs', contentSelector: '.wcb-tab-body', initial: 'description', /*callback: null*/ });

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
.wcb-generate-button {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  padding: 4px 8px;
  border: 1px solid var(--button-border-color);
  border-radius: 4px;
  background: var(--button-background-color);
  color: var(--button-text-color);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--button-hover-background-color);
    border-color: var(--button-hover-border-color);
    color: var(--button-hover-text-color);
  }

  i {
    font-size: 14px;
    color: currentColor;
  }
}

.header-name {
  align-items: center;
}
</style>