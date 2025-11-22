<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${getTabTypeIcon(WindowTabType.Front)} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name" 
          class="fcb-input-name"
          :showImage="false"
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
          :tag-setting="SettingKey.frontTags"
          @tag-added="onTagChange"
          @tag-removed="onTagChange"
        />
      </div>
      <ContentTabStrip 
        :tabs="tabs" 
        default-tab="description"
        add-tab
        :add-tab-label="localize('labels.tabs.front.createNewDanger')"
        @add-tab="onAddTab"
      >
        <DescriptionTab
          :name="currentFront?.name || 'Front'"
          :image-url="currentFront?.img"
          :window-type="WindowTabType.Front"
          alt-tab-id="description"
          @image-change="onImageChange"
        >
          <div class="flexrow form-group">
            <Editor 
              :initial-content="currentFront?.description || ''"
              fixed-height="380px"
              :current-entity-uuid="currentFront?.uuid"
              @editor-saved="onDescriptionEditorSaved"
            />
          </div>
        </DescriptionTab>

        <!-- the danger tabs are named by danger index -->
        <div 
          v-for="(_danger, index) in currentFront?.dangers"
          :key="index"
          class="tab flexcol" data-group="primary" :data-tab="index"
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
  import { storeToRefs } from 'pinia';
  import { ref, watch, onBeforeUnmount, computed, } from 'vue';

  // local imports
  import { useMainStore, useCampaignDirectoryStore, useNavigationStore, } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';
  import { localize } from '@/utils/game'
  import { SettingKey, } from '@/settings';
  import { notifyWarn } from '@/utils/notifications';

  // library components
  import InputText from 'primevue/inputtext';
  
  // local components
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue'; 
  import Tags from '@/components/Tags.vue';
  import Editor from '@/components/Editor.vue';
  import FrontDangerTab from './FrontDangerTab.vue';
  import ContentTabStrip from '@/components/ContentTab/ContentTabStrip.vue';

  // types
  import { WindowTabType } from '@/types';
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
  const { currentFront, currentContentTab } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data  
  const name = ref<string>('');

  ////////////////////////////////
  // computed data

  const tabs = computed(() => {
    let retval = [
      { id: 'description', label: localize('labels.tabs.front.description')},
    ];

    // danger tabs are just keyed by index
    for (let i=0; i < (currentFront.value?.dangers?.length || 0); i++) {
      const danger = currentFront.value!.dangers[i];
      
      retval.push({ id: i.toString(), label: danger.name });
    }
    
    return retval;
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  // debounce changes to name/number/strong start
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('errors.nameRequired'));
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

  const onAddTab = async (): Promise<void> => {
    if (!currentFront.value)
      return;

    await currentFront.value.createDanger();

    currentContentTab.value = `danger${currentFront.value.dangers.length - 1}`;

    await mainStore.refreshFront();
  }

  ////////////////////////////////
  // watchers
  watch(currentFront, async (newFront: Front | null): Promise<void> => {
    if (newFront && newFront.uuid) {
      // load starting data values
      name.value = newFront.name || '';
    }
  });
  
  // cleanup timers on unmount
  onBeforeUnmount(() => {
    clearTimeout(nameDebounceTimer);
  });

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">
</style>