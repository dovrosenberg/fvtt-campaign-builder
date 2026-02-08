<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${getTabTypeIcon(WindowTabType.StoryWeb)} sheet-icon`"></i>
        <InputText
          v-if="currentStoryWeb"
          v-model="name"
          for="fcb-input-name" 
          class="fcb-input-name"
          unstyled
          :placeholder="localize('placeholders.storyWebName')"
          :pt="{
            root: { class: 'full-height' } 
          }" 
          @update:model-value="onNameUpdate"
        />
      </header>
      <div class="fcb-sheet-subtab-container">
        <StoryWebGraph />
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
  // library imports
  import { ref, onMounted, watch, onBeforeUnmount } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useNavigationStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { getTabTypeIcon } from '@/utils/misc';
  import { notifyWarn } from '@/utils/notifications';

  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import StoryWebGraph from './StoryWebGraph.vue';

  // types
  import { StoryWeb } from '@/classes';
  import { WindowTabType } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const { currentStoryWeb } = useContentState();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();

  ////////////////////////////////
  // data
  const name = ref<string>('');

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  // debounce changes to name
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('errors.nameRequired'));
        name.value = currentStoryWeb.value?.name!;
        return;
      }

      if (currentStoryWeb.value && currentStoryWeb.value.name!==newValue) {
        currentStoryWeb.value.name = newValue;
        await currentStoryWeb.value.save();

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentStoryWeb.value.uuid]);
        await navigationStore.propagateNameChange(currentStoryWeb.value.uuid, newValue);
      }
    }, debounceTime);
  };

  ////////////////////////////////
  // watchers
  // Watch for story web changes
  watch(currentStoryWeb, (newStoryWeb: StoryWeb | null) => {
    name.value = newStoryWeb?.name || '';
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    name.value = currentStoryWeb.value?.name || '';
  });

  // Cleanup
  onBeforeUnmount(() => {
    clearTimeout(nameDebounceTimer);
  });

</script>

<style scoped>
</style>
