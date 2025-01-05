<template>
  <form class="'flexcol fwb-journal-subsheet ' + topic">
    <div ref="contentRef" class="sheet-container detailed flexcol">
      <header class="journal-sheet-header flexrow">
        <div class="sheet-image">
          <!-- <img class="profile nopopout" src="{{data.src}}" data-edit="src" onerror="if (!this.imgerr) { this.imgerr = true; this.src = 'modules/monks-enhanced-journal/assets/person.png' }"> -->
        </div>
        <div class="header-details fwb-content-header">
          <h1 class="header-name flexrow">
            <i :class="`fas ${icon} sheet-icon`"></i>
            <InputText
              v-model="name"
              for="fwb-input-name" 
              :placeholder="namePlaceholder"                
              :pt="{
                root: { class: 'full-height' } 
              }" 
              @update:model-value="onNameUpdate"
            />
          </h1>
          <div class="form-group fwb-content-header">
            <label>{{ localize('labels.fields.type') }}</label>
            <TypeAhead 
              :initial-list="typeList"
              :initial-value="currentEntry?.type as string || ''"
              @item-added="onTypeItemAdded"
              @selection-made="onTypeSelectionMade"
            />
          </div>

          <div 
            v-if="showHierarchy"
            class="form-group fwb-content-header"
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
      <nav class="fwb-sheet-navigation flexrow tabs" data-group="primary">
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
      <div class="fwb-tab-body flexcol">
        <div class="tab description flexcol" data-group="primary" data-tab="description">
          <div class="tab-inner flexcol">
            <Editor 
              :initial-content="currentEntry?.description || ''"
              :has-button="true"
              target="content-description"
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
            <RelatedDocumentTable />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="actors">
          <div class="tab-inner flexcol">
            <RelatedDocumentTable />
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
  import { getTopicIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { hasHierarchy, validParentItems, } from '@/utils/hierarchy';
  import { useTopicDirectoryStore, useMainStore, useNavigationStore, useRelationshipStore, } from '@/applications/stores';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import Editor from '@/components/Editor.vue';
  import TypeAhead from '@/components/TypeAhead.vue';
  import RelatedItemTable from '@/components/ItemTable/RelatedItemTable.vue';
  import RelatedDocumentTable from '@/components/DocumentTable/RelatedDocumentTable.vue';

  // types
  import { TopicFolder, Topics, } from '@/types';
  import { Entry, WBWorld } from '@/classes';

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
  const { currentEntry, currentWorld, currentContentTab, } = storeToRefs(mainStore);

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

  ////////////////////////////////
  // computed data
  const icon = computed((): string => (!topic.value ? '' : getTopicIcon(topic.value)));
  const showHierarchy = computed((): boolean => (topic.value===null ? false : hasHierarchy(topic.value)));
  const namePlaceholder = computed((): string => (topic.value===null ? '' : (localize(topicData[topic.value]?.namePlaceholder || '') || '')));
  const typeList = computed((): string[] => (topic.value===null || !currentWorld.value ? [] : currentWorld.value.topicFolders[topic.value].types));

  ////////////////////////////////
  // methods

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
        await navigationStore.propogateNameChange(currentEntry.value.uuid, newValue);
        await relationshipStore.propogateNameChange(currentEntry.value);
      }
    }, debounceTime);
  };

  // new type added in the typeahead
  const onTypeItemAdded = async (added: string) => {
    if (topic.value === null || !currentWorld.value)
      return;

    const currentTypes = currentWorld.value.topicFolders[topic.value].types;

    // if not a duplicate, add to the valid type lists 
    if (!currentTypes[topic.value].includes(added)) {
      const updatedTypes = {
        ...currentTypes,
        [topic.value]: currentTypes[topic.value].concat([added]),
      };
      currentWorld.value.topicFolders[topic.value].types = updatedTypes;
      await currentWorld.value.save();
    }

    await onTypeSelectionMade(added);
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

    //need to reset
    // if it's not automatic, clear and reset the documentpage
    // (this._partials.DescriptionEditoras as Editor).attachEditor(descriptionPage, newContent);
  };

  ////////////////////////////////
  // watchers
  // in case the tab is changed externally
  watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
    if (newTab!==oldTab)
      tabs.value?.activate(newTab || 'description');    
  });

  // if parent changes, make sure to update
  watch(() => currentEntry.value.parentId, async (newParentId: string | null): Promise<void> => {
    parentId.value = newParentId;    
  });
  
  watch(currentEntry, async (newEntry: Entry | null, oldEntry: Entry | null): Promise<void> => {
    // if we changed entries, reset the tab
    if (newEntry?.uuid!==oldEntry?.uuid )
      currentContentTab.value = 'description';

    if (!newEntry || !newEntry.uuid) {
      topic.value = null;
    } else {
      let newTopicFolder: TopicFolder;

      newTopicFolder = newEntry.topicFolder;
      if (!newTopicFolder) 
        throw new Error('Invalid entry topic in EntryContent.watch-currentEntry');

      // we're going to show a content page
      topic.value = newTopicFolder.topic;

      // load starting data values
      name.value = newEntry.name || '';

      // set the parent and valid parents
      if (currentWorld.value) {    
        // TODO - need to refresh both of these somehow if things are moved around in the directory
        parentId.value = currentWorld.value.getEntryHierarchy(newEntry.uuid)?.parentId || null;

        validParents.value = validParentItems(currentWorld.value as WBWorld, newTopicFolder, newEntry).map((e)=> ({
          id: e.id,
          label: e.name || '',
        }));
      }
    }
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    tabs.value = new Tabs({ navSelector: '.tabs', contentSelector: '.fwb-tab-body', initial: 'description', /*callback: null*/ });

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