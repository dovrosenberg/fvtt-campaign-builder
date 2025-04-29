<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${icon} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name"
          class="fcb-input-name"
          unstyled
          :placeholder="namePlaceholder"
          :pt="{
            root: { class: 'full-height' }
          }"
          @update:model-value="onNameUpdate"
        />
        <button
          v-if="canGenerate"
          class="fcb-generate-button"
          @click="onGenerateButtonClick"
          :disabled="generateDisabled"
          :title="`${localize('tooltips.generateContent')}${generateDisabled ? ` ${localize('tooltips.backendNotAvailable')}` : ''}`"
        >
          <i class="fas fa-head-side-virus"></i>
        </button>
      </header>
      <div class="flexrow">
        <Tags
          v-if="currentEntry"
          v-model="currentEntry.tags"
          :tag-setting="SettingKey.entryTags"
          @tag-added="onTagChange"
          @tag-removed="onTagChange"
        />
      </div>
      <nav class="fcb-sheet-navigation flexrow tabs" data-group="primary">
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
      <div class="fcb-tab-body flexrow">
        <DescriptionTab 
          :name="currentEntry?.name || 'Entry'"
          :image-url="currentEntry?.img"
          :window-type="WindowTabType.Entry"
          :topic="topic as ValidTopic"
          @image-change="onImageChange"
        >
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.type"
            />
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
            <LabelWithHelp
              label-text="labels.fields.species"
            />
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
            <LabelWithHelp
              label-text="labels.fields.parent"
            />
            <TypeAhead 
              :initial-list="validParents"
              :initial-value="parentId || ''"
              @selection-made="onParentSelectionMade"
            />
          </div>

          <div class="flexrow form-group description">
            <Editor
              :initial-content="currentEntry?.description || ''"
              :has-button="true"
              @editor-saved="onDescriptionEditorSaved"
            />
          </div>
        </DescriptionTab>
        <div class="tab flexcol" data-group="primary" data-tab="characters">
          <div class="tab-inner">
            <RelatedItemTable :topic="Topics.Character" />
          </div>
        </div> 
        <div class="tab flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner">
            <RelatedItemTable :topic="Topics.Location" />
          </div>
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="organizations">
          <div class="tab-inner">
            <RelatedItemTable :topic="Topics.Organization" />
          </div>
        </div>
        <!-- Events tab commented 
        <div class="tab flexcol" data-group="primary" data-tab="events">
          <div class="tab-inner">
            <RelatedItemTable :topic="Topics.Event" />
          </div>
        </div>
        -->
        <div class="tab flexcol" data-group="primary" data-tab="scenes">
          <div class="tab-inner">
            <RelatedDocumentTable 
              :document-link-type="DocumentLinkType.Scenes"
            />
          </div>
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="actors">
          <div class="tab-inner">
            <RelatedDocumentTable 
              :document-link-type="DocumentLinkType.Actors"
            />
          </div>
        </div>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">

  // library imports
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTopicIcon, htmlToPlainText } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useTopicDirectoryStore, useMainStore, useNavigationStore, useRelationshipStore, } from '@/applications/stores';
  import { hasHierarchy, validParentItems, } from '@/utils/hierarchy';
  import { generateImage } from '@/utils/generation';
  import { SettingKey } from '@/settings';
  
  // library components
  import InputText from 'primevue/inputtext';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue';
  import RelatedItemTable from '@/components/Tables/RelatedItemTable.vue';
  import RelatedDocumentTable from '@/components/Tables/RelatedDocumentTable.vue';
  
  import Editor from '@/components/Editor.vue';
  import TypeAhead from '@/components/TypeAhead.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import Tags from '@/components/Tags.vue';

  // types
  import { DocumentLinkType, Topics, ValidTopic, WindowTabType } from '@/types';
  import { WBWorld, TopicFolder, Backend, Entry } from '@/classes';
  import { updateEntryDialog } from '@/dialogs/createEntry';

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
    // [Topics.Event]: { namePlaceholder: 'placeholders.characterName', }, // Commented out as events are not currently needed
    [Topics.Location]: { namePlaceholder: 'placeholders.characterName', },
    [Topics.Organization]: { namePlaceholder: 'placeholders.characterName', },
  };

  const relationships = [
    { tab: 'characters', label: 'labels.tabs.entry.characters', },
    { tab: 'locations', label: 'labels.tabs.entry.locations',},
    { tab: 'organizations', label: 'labels.tabs.entry.organizations', },
    // { tab: 'events', label: 'labels.tabs.entry.events', }, // Commented out as events are not currently needed
  ] as { tab: string; label: string }[];

  const tabs = ref<foundry.applications.ux.Tabs>();
  const topic = ref<Topics | null>(null);
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const parentId = ref<string | null>(null);
  const validParents = ref<{id: string; label: string}[]>([]);
  const isGeneratingImage = ref<boolean>(false); // Flag to track whether image generation is in progress
  
  ////////////////////////////////
  // computed data
  const icon = computed((): string => (!topic.value ? '' : getTopicIcon(topic.value)));
  const namePlaceholder = computed((): string => (topic.value===null ? '' : (localize(topicData[topic.value]?.namePlaceholder || '') || '')));
  const canGenerate = computed(() => topic.value && [Topics.Character, Topics.Location, Topics.Organization].includes(topic.value));
  const generateDisabled = computed(() => !Backend.available);
  const showHierarchy = computed((): boolean => (topic.value===null ? false : hasHierarchy(topic.value)));

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
        await relationshipStore.propagateFieldChange(currentEntry.value, 'name');
      }
    }, debounceTime);
  };

  const onGenerateButtonClick = (event: MouseEvent): void => {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    if (topic.value != null && ![Topics.Character, Topics.Location, Topics.Organization].includes(topic.value)) {
      return;
    }

    // Show context menu
    const menuItems = [
      {
        icon: 'fa-file-lines',
        iconFontClass: 'fas',
        label: localize('contextMenus.generate.description'),        onClick: async () => {
          if (currentEntry.value)
            await updateEntryDialog(currentEntry.value);
        }
      },
      {
        icon: 'fa-image',
        iconFontClass: 'fas',
        label: `${localize('contextMenus.generate.image')} ${isGeneratingImage.value ? ` (${localize('contextMenus.generate.inProgress')})` : ''}`,
        disabled: isGeneratingImage.value,
        onClick: async () => {
          if (!isGeneratingImage.value && currentWorld.value && currentEntry.value) {
            isGeneratingImage.value = true;

            // save entry because it could change before generation is done
            const entryGenerated = currentEntry.value.uuid;

            await generateImage(currentWorld.value, currentEntry.value);

            if (entryGenerated===currentEntry.value.uuid)
              mainStore.refreshEntry();

            isGeneratingImage.value = false;
          }
        }
      },
    ];

    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: menuItems,
    });
  };

  
  const onImageChange = async (imageUrl: string) => {
    if (currentEntry.value) {
      currentEntry.value.img = imageUrl;
      await currentEntry.value.save();
    }
  }

  // we can use this for add and remove because the change was already passed back to 
  //    currentEntry - we just need to save
  const onTagChange = async (): Promise<void> => {
    if (!currentEntry.value)
      return;
    await currentEntry.value.save();
  }

  const onTypeSelectionMade = async (selection: string) => {
    if (currentEntry.value) {
      const oldType = currentEntry.value.type;
      currentEntry.value.type = selection;
      await currentEntry.value.save();

      // Update the type in the directory tree
      await topicDirectoryStore.updateEntryType(currentEntry.value, oldType);

      // Propagate the type change to all related entries
      await relationshipStore.propagateFieldChange(currentEntry.value, 'type');
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
  
  watch(currentEntry, async (): Promise<void> => {
    await refreshEntry();

    if (!currentContentTab.value)
      currentContentTab.value = 'description';

    tabs.value?.activate(currentContentTab.value); 
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    tabs.value = new foundry.applications.ux.Tabs({ navSelector: '.tabs', contentSelector: '.fcb-tab-body', initial: 'description', /*callback: null*/ });

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