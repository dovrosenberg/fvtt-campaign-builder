<template>
  <form 
    :class="'flexcol fwb-journal-subsheet ' + topic" 
  >
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
            <label>{{ localize('fwb.labels.fields.type') }}</label>
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
            <label>{{ localize('fwb.labels.fields.parent') }}</label>
            <TypeAhead 
              :initial-list="validParents"
              :initial-value="parentId || ''"
              @selection-made="onParentSelectionMade"
            />
          </div>
        </div>
      </header>
      <nav class="fwb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="description">{{ localize('fwb.labels.tabs.description') }}</a>
        <a 
          v-for="relationship in relationships"
          :key="relationship.label"
          class="item" 
          :data-tab="relationship.tab"
        >
          {{ localize(relationship.label) }}
        </a>
      </nav>
      <div class="fwb-tab-body flexcol">
        <div class="tab description flexcol" data-group="primary" data-tab="description">
          <div class="tab-inner flexcol">
            <Editor 
              :initialContent="currentEntry?.description || ''"
              :has-button="true"
              target="content-description"
              @editor-saved="onDescriptionEditorSaved"
            />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="characters">
          <div class="tab-inner flexcol">
            <RelatedItemTable :topic="Topic.Character" />
          </div>
        </div> 
        <div class="tab description flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner flexcol">
            <RelatedItemTable :topic="Topic.Location" />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="organizations">
          <div class="tab-inner flexcol">
            <RelatedItemTable :topic="Topic.Organization" />
          </div>
        </div>
        <div class="tab description flexcol" data-group="primary" data-tab="events">
          <div class="tab-inner flexcol">
            <RelatedItemTable :topic="Topic.Event" />
          </div>
        </div>
      </div>
    </div>
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { computed, nextTick, onMounted, ref, toRaw, watch } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTopicIcon, } from '@/utils/misc';
  import { WorldFlagKey, WorldFlags } from '@/settings/WorldFlags';
  import { localize } from '@/utils/game';
  import { hasHierarchy, validParentItems, } from '@/utils/hierarchy';
  import { useTopicDirectoryStore, useMainStore, useNavigationStore, } from '@/applications/stores';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import Editor from '@/components/Editor.vue';
  import TypeAhead from '@/components/TypeAhead.vue';
  import RelatedItemTable from '@/components/ItemTable/RelatedItemTable.vue';
  
  // types
  import { ValidTopic, Topic, } from '@/types';
  import { EntryDoc } from '@/documents';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const topicDirectoryStore = useTopicDirectoryStore();
  const navigationStore = useNavigationStore();
  const { currentEntry, currentWorldId, currentContentTab  } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const topicData = {
    [Topic.Character]: { namePlaceholder: 'fwb.placeholders.characterName', },
    [Topic.Event]: { namePlaceholder: 'fwb.placeholders.characterName', },
    [Topic.Location]: { namePlaceholder: 'fwb.placeholders.characterName', },
    [Topic.Organization]: { namePlaceholder: 'fwb.placeholders.characterName', },
  };

  const relationships = [
    { tab: 'characters', label: 'fwb.labels.tabs.characters', },
    { tab: 'locations', label: 'fwb.labels.tabs.locations',},
    { tab: 'organizations', label: 'fwb.labels.tabs.organizations', },
    { tab: 'events', label: 'fwb.labels.tabs.events', },
    { tab: 'scenes', label: 'fwb.labels.tabs.scenes', },
  ] as { tab: string; label: string }[];

  const tabs = ref<Tabs>();
  const topic = ref<Topic | null>(null);
  const name = ref<string>('');

  const rawDocument = ref<EntryDoc>();

  const contentRef = ref<HTMLElement | null>(null);
  const parentId = ref<string | null>(null);
  const validParents = ref<{id: string; label: string}[]>([]);

  ////////////////////////////////
  // computed data
  const icon = computed((): string => (!topic.value ? '' : getTopicIcon(topic.value)));
  const showHierarchy = computed((): boolean => (topic.value===null ? false : hasHierarchy(topic.value)));
  const namePlaceholder = computed((): string => (topic.value===null ? '' : (localize(topicData[topic.value]?.namePlaceholder || '') || '')));
  const typeList = computed((): string[] => (topic.value===null || !currentWorldId.value ? [] : WorldFlags.get(currentWorldId.value, WorldFlagKey.types)[topic.value]));

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
        await currentEntry.save();

        await topicDirectoryStore.refreshTopicDirectoryTree([currentEntry.value.uuid]);
        await navigationStore.propogateNameChange(currentEntry.value.uuid, newValue);
      }
    }, debounceTime);
  };

  // new type added in the typeahead
  const onTypeItemAdded = async (added: string) => {
    if (topic.value === null || !currentWorldId.value)
      return;

    const currentTypes = WorldFlags.get(currentWorldId.value, WorldFlagKey.types);

    // if not a duplicate, add to the valid type lists 
    if (!currentTypes[topic.value].includes(added)) {
      const updatedTypes = {
        ...currentTypes,
        [topic.value]: currentTypes[topic.value].concat([added]),
      };
      await WorldFlags.set(currentWorldId.value, WorldFlagKey.types, updatedTypes);
    }

    await onTypeSelectionMade(added);
  };

  const onTypeSelectionMade = async (selection: string) => {
    if (currentEntry.value) {
      currentEntry.value.type = selection;
      await currentEntry.value.save();

      await topicDirectoryStore.updateEntryType(currentEntry.value, selection);
    }
  };

  const onParentSelectionMade = async (selection: string): Promise<void> => {
    if (!currentEntry.value?.topic || !currentEntry.value?.uuid)
      return;

    await topicDirectoryStore.setNodeParent(currentEntry.value.topic, currentEntry.value.uuid, selection || null);
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
  watch([currentEntry, currentWorldId], async (): Promise<void> => {
    if (!currentEntry.value) {
      topic.value = null;
    } else {
      let newTopic;

      newTopic = currentEntry.value.topic as ValidTopic;
      if (!newTopic) 
        throw new Error('Invalid entry topic in EntryContent.watch-currentEntry');

      // we're going to show a content page
      topic.value = newTopic;

      // load starting data values
      name.value = currentEntry.value.name || '';

      // set the parent and valid parents
      if (!currentEntry.value.uuid) {
        parentId.value = null;
        validParents.value = [];
      } else {
        if (currentWorldId.value) {
          parentId.value = WorldFlags.getHierarchy(currentWorldId.value, currentEntry.value.uuid)?.parentId || null;
      
          // TODO - need to refresh this somehow if things are moved around in the directory
          validParents.value = validParentItems(currentWorldId.value, newTopic, currentEntry.value).map((e)=> ({
            id: e.id,
            label: e.name || '',
          }));
        }
      }
  
      // reattach the editor to the new entry
      rawDocument.value = currentEntry.value.raw;
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
    tabs.value.bind(contentRef.value);
  });


</script>

<style lang="scss">

</style>