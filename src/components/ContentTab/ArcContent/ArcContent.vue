<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${getTabTypeIcon(WindowTabType.Arc)} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name" 
          class="fcb-input-name"
          unstyled
          :placeholder="localize('placeholders.arcName')"
          :pt="{
            root: { class: 'full-height' } 
          }" 
          @update:model-value="onNameUpdate"
        />
      </header>
      <div class="flexrow">
        <Tags
          v-if="currentArc"
          v-model="currentArc.tags"
          :tag-setting="SettingKey.arcTags"
          @tag-added="onTagChange"
          @tag-removed="onTagChange"
        />
      </div>
      <ContentTabStrip 
        :tabs="tabs" 
        default-tab="description"
      >
        <DescriptionTab
          :name="currentArc?.name || 'Arc'"
          :image-url="currentArc?.img"
          :window-type="WindowTabType.Arc"
          :show-image="ModuleSettings.get(SettingKey.showImages)?.arcs ?? true"
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
              :initial-content="currentArc?.description || ''"
              fixed-height="240px"
              :current-entity-uuid="currentArc?.uuid"
              @editor-saved="onDescriptionEditorSaved"
            />
          </div>

          <CustomFieldsBlocks
            v-if="currentArc"
            :content-type="CustomFieldContentType.Arc"
            :content="currentArc"
          />
        </DescriptionTab>
        <div class="tab flexcol" data-group="primary" data-tab="participants">
          <div class="tab-inner">
            <ArcParticipantTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="lore">
          <div class="tab-inner">
            <SessionLoreTab 
              :arc-mode="true"
            />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner">
            <SessionLocationTab 
              :arc-mode="true"
            />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="monsters">
          <div class="tab-inner">
            <SessionMonsterTab 
              :arc-mode="true"
            />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="ideas">
          <div class="tab-inner">
            <CampaignIdeasTab 
              :arc-mode="true"
            />
          </div>  
        </div>
        <div v-if="showStoryWebTab" class="tab flexcol" data-group="primary" data-tab="storyWebs">
          <div class="tab-inner">
            <StoryWebsTab mode="arc" />
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
  import { ModuleSettings, SettingKey } from '@/settings';
  import { notifyWarn } from '@/utils/notifications';

  // library components
  import InputText from 'primevue/inputtext';
  
  // local components
  import Editor from '@/components/Editor.vue';
  import SessionLocationTab from '@/components/ContentTab/SessionContent/SessionLocationTab.vue';
  import ArcParticipantTab from '@/components/ContentTab/ArcContent/ArcParticipantTab.vue';
  import SessionMonsterTab from '@/components/ContentTab/SessionContent/SessionMonsterTab.vue';
  import SessionLoreTab from '@/components/ContentTab/SessionContent/SessionLoreTab.vue';
  import CampaignIdeasTab from '@/components/ContentTab/CampaignContent/CampaignIdeasTab.vue';
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue'; 
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import Tags from '@/components/Tags.vue';
  import ContentTabStrip from '@/components/ContentTab/ContentTabStrip.vue';
  import StoryWebsTab from '@/components/ContentTab/StoryWebsTab.vue';
  import CustomFieldsBlocks from '@/components/CustomFieldsBlocks.vue';

  // types
  import { ContentTabDescriptor, CustomFieldContentType, WindowTabType } from '@/types';
  import { Arc } from '@/classes';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentArc, } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const name = ref<string>('');
  const descriptionContent = ref<string>('');

  ////////////////////////////////
  // computed data
  const showStoryWebTab = computed(() => {
    return ModuleSettings.get(SettingKey.useWebs);
  });

  const tabs = computed(() => [
    { id: 'description', label: localize('labels.description')},
    { id: 'lore', label: localize('labels.tabs.arc.lore')},
    { id: 'locations', label: localize('labels.tabs.arc.locations')},
    { id: 'participants', label: localize('labels.tabs.arc.participants')},
    { id: 'monsters', label: localize('labels.tabs.arc.monsters')},
    { id: 'ideas', label: localize('labels.tabs.arc.ideas')},
    ...(showStoryWebTab.value ? [{ id: 'storyWebs', label: localize('contentFolders.storyWebs') }] : []),
  ] as ContentTabDescriptor[]);

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
        name.value = currentArc.value?.name!;
        return;
      }

      if (currentArc.value && currentArc.value.name!==newValue) {
        currentArc.value.name = newValue;
        await currentArc.value.save();

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentArc.value.uuid]);
        await navigationStore.propagateNameChange(currentArc.value.uuid, newValue);
      }
    }, debounceTime);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentArc.value)
      return;

    currentArc.value.description = newContent;
    await currentArc.value.save();

    mainStore.refreshArc();
  };

  const onImageChange = async (imageUrl: string) => {
    if (currentArc.value) {
      currentArc.value.img = imageUrl;
      await currentArc.value.save();
    }
  }

  // we can use this for add and remove because the change was already passed back to 
  //    currentArc - we just need to save
  const onTagChange = async (): Promise<void> => {
    if (!currentArc.value)
      return;
    await currentArc.value.save();
  }

  ////////////////////////////////
  // watchers
  watch(currentArc, async (newArc: Arc | null): Promise<void> => {
    if (newArc && newArc.uuid) {
      // load starting data values
      name.value = newArc.name || '';
      descriptionContent.value = newArc.description || '';
    }
  });
  

  ////////////////////////////////
  // cleanup timers on unmount
  onBeforeUnmount(() => {
    clearTimeout(nameDebounceTimer);
  });

  // lifecycle events

</script>

<style lang="scss">
  .fcb-strong-start-header {
    font-size: var(--fcb-font-size-large);
    font-weight: 600;
    font-family: var(--fcb-font-family);
    color: var(--fcb-sheet-header-label-color);
    margin-bottom: .5rem;
  }
  .fcb-table-help-icon {
    margin-left: 8px;
    margin-right: 8px;
    font-size: var(--fcb-font-size-large);
    cursor: pointer;
  }
  .p-datepicker .p-inputtext{
   padding-left: 8px; 
   font-size: var(--fcb-font-size-large) !important;
  }
</style>