<template>
  <div class="wcb-description-wrapper flexrow">
    <ImagePicker
      v-model="entryImg"
      :title="`Select Image for ${currentEntry?.name || 'Entry'}`"
    />        
    <div class="wcb-tab-content flexcol">
      <div class="flexrow form-group">
        <label>{{ localize('labels.fields.type') }}</label>
        <TypeSelect
          :initial-value="currentEntry?.type || ''"
          :topic="props.topic"
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
          :initial-value="props.parentId || ''"
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
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, PropType } from 'vue';
  import { storeToRefs, } from 'pinia';

  // local imports
  import { hasHierarchy, } from '@/utils/hierarchy';
  import { useMainStore, useTopicDirectoryStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components

  // local components
  import Editor from '@/components/Editor.vue';
  import TypeAhead from '@/components/TypeAhead.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import ImagePicker from '@/components/ImagePicker.vue'; 

  // types
  import { ValidTopic, Topics, } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    validParents: {
      type: Array as PropType<{id: string; label: string}[]>,
      required: false,
      default: [],
    },
    topic: {
      type: Number as PropType<ValidTopic>,
      required: true,
    },
    parentId: {
      type: String,
      required: false,
      default: '',
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const topicDirectoryStore = useTopicDirectoryStore();
  const { currentEntry, } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const defaultImage = 'icons/svg/mystery-man.svg'; // Default Foundry image

  ////////////////////////////////
  // computed data
  const showHierarchy = computed((): boolean => (props.topic===null ? false : hasHierarchy(props.topic)));
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

  ////////////////////////////////
  // event handlers
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


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="sass">
</style>