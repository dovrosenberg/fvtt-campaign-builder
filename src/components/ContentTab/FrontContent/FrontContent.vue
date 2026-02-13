<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${getTabTypeIcon(WindowTabType.Front)} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name" 
          class="fcb-input-name"
          unstyled
          :placeholder="localize('placeholders.frontName')"
          :pt="{
            root: { class: 'full-height' } 
          }" 
          @update:model-value="onNameUpdate"
        />
      </header>
      <div class="flexrow">
        <Tags
          v-if="currentFront"
          v-model="currentFront.tags"
          :tag-setting="SettingKey.contentTags"
          @tag-added="onTagChange"
          @tag-removed="onTagChange"
          @tag-click="onTagClick"
        />
      </div>
      <ContentTabStrip 
        :tabs="tabs" 
        default-tab="description"
        add-tab
        :add-tab-label="localize('labels.tabs.front.createNewDanger')"
        @add-tab="onAddTab"
        @delete-tab="onDeleteTab"
      >
        <DescriptionTab
          :name="currentFront?.name || 'Front'"
          :image-url="currentFront?.img"
          :window-type="WindowTabType.Front"
          :show-image="ModuleSettings.get(SettingKey.showImages)?.fronts ?? true"
          alt-tab-id="description"
          @image-change="onImageChange"
        >
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.description"
            />
          </div>
          <div class="flexrow form-group">
            <Editor 
              :initial-content="currentFront?.description || ''"
              :fixed-height="descriptionHeight"
              :resizable="true"
              :current-entity-uuid="currentFront?.uuid"
              @editor-saved="onDescriptionEditorSaved"
              @editor-resized="onDescriptionEditorResized"
            />
          </div>
        </DescriptionTab>

        <!-- the danger tabs are named by danger index with 'danger' prefix -->
        <div 
          v-for="(_danger, index) in currentFront?.dangers"
          :key="index"
          class="tab flexcol" data-group="primary" :data-tab="`danger${index}`"
        >
          <div class="tab-inner">
            <FrontDangerTab 
            />
          </div>  
        </div>
      </ContentTabStrip>
    </div>
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { ref, watch, onBeforeUnmount, computed, provide, } from 'vue';

  // local imports
  import { useMainStore, useCampaignDirectoryStore, useNavigationStore, } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { useFrontDerivedState, FRONT_DERIVED_STATE_KEY } from '@/composables/useFrontDerivedState';
  import { getTabTypeIcon } from '@/utils/misc';
  import { localize } from '@/utils/game'
  import { notifyWarn } from '@/utils/notifications';
  import { ModuleSettings, SettingKey } from '@/settings';

  // library components
  import InputText from 'primevue/inputtext';
  
  // local components
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue'; 
  import Tags from '@/components/Tags.vue';
  import Editor from '@/components/Editor.vue';
  import FrontDangerTab from './FrontDangerTab.vue';
  import ContentTabStrip from '@/components/ContentTab/ContentTabStrip.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';

  // types
  import type { WindowTabType, ContentTabDescriptor } from '@/types';
  import { Front, } from '@/classes';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentFront, currentContentTab } = useContentState();

  // per-panel derived state for front dangers
  const frontDerivedState = useFrontDerivedState();
  provide(FRONT_DERIVED_STATE_KEY, frontDerivedState);

  ////////////////////////////////
  // data  
  const name = ref<string>('');
  const descriptionHeight = ref<number>(23.75);  // for handling description editor height

  ////////////////////////////////
  // computed data

  const tabs = computed((): ContentTabDescriptor[] => {
    let retval: ContentTabDescriptor[] = [
      { id: 'description', label: localize('labels.description')},
    ];

    // danger tabs are keyed by index with 'danger' prefix
    for (let i=0; i < (currentFront.value?.dangers?.length || 0); i++) {
      const danger = currentFront.value!.dangers[i];
      
      retval.push({ id: `danger${i}`, label: danger.name, deletable: true });
    }
    
    return retval;
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  const onDescriptionEditorResized = async (height: number) => {
    if (!currentFront.value)
      return;
    
    descriptionHeight.value = height;
    currentFront.value?.setCustomFieldHeight('###description###', height);
    await currentFront.value?.save();
  };

  // debounce changes to name
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('notifications.nameRequired'));
        name.value = currentFront.value?.name!;
        return;
      }

      if (currentFront.value && currentFront.value.name!==newValue) {
        currentFront.value.name = newValue;
        await currentFront.value.save();

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentFront.value.uuid]);
        await navigationStore.propagateNameChange(currentFront.value.uuid, newValue);
      }
    }, debounceTime);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentFront.value)
      return;

    currentFront.value.description = newContent;
    await currentFront.value.save();
  };

  const onImageChange = async (imageUrl: string) => {
    if (currentFront.value) {
      currentFront.value.img = imageUrl;
      await currentFront.value.save();
    }
  }

  // we can use this for add and remove because the change was already passed back to 
  //    currentFront - we just need to save
  const onTagChange = async (): Promise<void> => {
    if (!currentFront.value)
      return;
    await currentFront.value.save();
  }

  const onTagClick = async (tagName: string): Promise<void> => {
    // Open the tag results tab for the clicked tag
    await navigationStore.openTagResults(tagName, { newTab: true, activate: true });
  }

  const onAddTab = async (): Promise<void> => {
    if (!currentFront.value)
      return;

    await currentFront.value.createDanger();

    currentContentTab.value = `danger${currentFront.value.dangers.length - 1}`;

    await mainStore.refreshFront();
  }

  const onDeleteTab = async (tabId: string): Promise<void> => {
    if (!currentFront.value)
      return;

    // extract the danger index from the tab id (e.g., 'danger0' -> 0)
    const dangerIndex = parseInt(tabId.replace('danger', ''));
    if (isNaN(dangerIndex))
      return;

    await currentFront.value.deleteDanger(dangerIndex);

    // switch to description tab after deletion
    currentContentTab.value = 'description';

    await mainStore.refreshFront();
  }

  ////////////////////////////////
  // watchers
  watch(currentFront, async (newFront: Front | null): Promise<void> => {
    if (newFront && newFront.uuid) {
      // load starting data values
      name.value = newFront.name || '';

      descriptionHeight.value = newFront.getCustomFieldHeight('###description###') || 23.75;
    }
  });
  
  ////////////////////////////////
  // lifecycle events
  // cleanup timers on unmount
  onBeforeUnmount(() => {
    clearTimeout(nameDebounceTimer);
  });


</script>

<style lang="scss">
</style>