<template>
  <form class="flexcol wcb-journal-subsheet">
    <div ref="contentRef" class="wcb-sheet-container flexcol">
      <header class="wcb-journal-sheet-header flexrow">
        <ImagePicker
          v-model="worldImg"
          :title="`Select Image for ${currentWorld?.name || 'World'}`"
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
          </h1>
          <div v-if="currentWorld">
            <div class="flexrow form-group">
              <label>{{ localize('labels.fields.worldGenre') }} <span class="wcb-header-notes">{{ localize('help.worldGenre') }}</span></label><br/>
              <InputText
                v-model="currentWorld.genre"
                type="text"
                style="width: 250px"
                @update:model-value="onGenreSaved"
              />
            </div>
            <div class="flexrow form-group">
              <label>{{ localize('labels.fields.worldFeeling') }} <span class="wcb-header-notes">{{ localize('help.worldFeeling') }}</span></label><br/>
              <Textarea
                v-model="currentWorld.worldFeeling"
                rows="3"
                style="width: calc(100% - 2px)"
                @update:model-value="onWorldFeelingSaved"
              />
            </div>
          </div>
        </div>
      </header>
      <nav class="wcb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="description">{{ localize('labels.tabs.campaign.description') }}</a>
      </nav>
      <div class="wcb-tab-body flexcol">
        <div class="tab description flexcol" data-group="primary" data-tab="description">
          <div v-if="currentWorld" class="tab-inner flexcol">
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
  import ImagePicker from '@/components/ImagePicker.vue';

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

  const tabs = ref<foundry.applications.ux.Tabs>();
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const icon =  getTabTypeIcon(WindowTabType.Campaign);

  ////////////////////////////////
  // computed data
  const namePlaceholder = computed((): string => (localize('placeholders.worldName') || ''));
  const worldImg = computed({
    get: (): string => currentWorld.value?.img || '',
    set: async (value: string) => {
      if (currentWorld.value) {
        currentWorld.value.img = value;
        await currentWorld.value.save();
      }
    }
  });
  
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
  watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
    if (newTab!==oldTab)
      tabs.value?.activate(newTab || 'description');    
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

    // load starting data values
    name.value = currentWorld.value?.name || '';
  });


</script>

<style lang="scss">
  .wcb-header-notes {
    font-size: 0.85em;
    font-weight: normal;
    font-style: italic;
    color: var(--color-text-dark-secondary, #7a7971);
  }
</style>