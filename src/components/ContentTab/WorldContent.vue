<template>
  <form :class="'flexcol wcb-journal-subsheet'">
    <div ref="contentRef" class="wcb-sheet-container flexcol">
      <header class="wcb-journal-sheet-header flexrow">
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
          </h1>
        </div>
      </header>
      <nav class="wcb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="description">{{ localize('labels.tabs.campaign.description') }}</a>
      </nav>
      <div class="wcb-tab-body flexcol">
        <div class="tab description flexcol" data-group="primary" data-tab="description">
          <div class="sheet-image">
            <!-- <img class="profile nopopout" src="{{data.src}}" data-edit="src" onerror="if (!this.imgerr) { this.imgerr = true; this.src = 'modules/monks-enhanced-journal/assets/person.png' }"> -->
          </div>
          <div v-if="currentWorld" class="tab-inner flexcol">
            <h6>Genre (ex. "Fantasy" - Needed for AI generation)</h6>
            <InputText
              v-model="currentWorld.genre"
              type="text" 
              style="width: 250px"
              @update:model-value="onGenreSaved"
            />
            <h6>World Feeling (ex. "Rugged and dangerous with low level of magic, reserved for the elites" - Improves AI generation)</h6>
            <Textarea 
              v-model="currentWorld.worldFeeling"
              rows="2"
              @update:model-value="onWorldFeelingSaved"
            />
            <h6>Description/Notes</h6>
            <Editor 
              :initial-content="currentWorld.description || ''"
              :has-button="true"
              @editor-saved="onDescriptionEditorSaved"
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
  import { getTabTypeIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useMainStore, useNavigationStore, useTopicDirectoryStore } from '@/applications/stores';
  
  // library components
  import InputText from 'primevue/inputtext';
  import Textarea from 'primevue/textarea';

  // local components
  import Editor from '@/components/Editor.vue';
  
  // types
  import { WindowTabType, } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const topicDirectoryStore = useTopicDirectoryStore();
  const { currentContentTab, currentWorld } = storeToRefs(mainStore);

  ////////////////////////////////
  // data

  const tabs = ref<Tabs>();
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const icon =  getTabTypeIcon(WindowTabType.Campaign);
 
  ////////////////////////////////
  // computed data
  const namePlaceholder = computed((): string => (localize('placeholders.campaignName') || ''));
  
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
      if (currentWorld.value && currentWorld.value.name!==newValue) {
        currentWorld.value.name = newValue;
        await currentWorld.value.save();

        await topicDirectoryStore.refreshTopicDirectoryTree([currentWorld.value.uuid]);
        await navigationStore.propagateNameChange(currentWorld.value.uuid, newValue);
      }
    }, debounceTime);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentWorld.value)
      return;

    currentWorld.value.description = newContent;
    await currentWorld.value.save();
  };

  const onGenreSaved = async () => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      if (currentWorld.value)
        await currentWorld.value.save();
    }, debounceTime);
  }

  const onWorldFeelingSaved = async () => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      if (currentWorld.value)
        await currentWorld.value.save();
    }, debounceTime);
  }

  ////////////////////////////////
  // watchers
  watch([currentWorld], async (): Promise<void> => {
    if (!currentWorld.value)
      return;

    // reset the tab
    currentContentTab.value = 'description';

    // load starting data values
    name.value = currentWorld.value.name || '';
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

</style>