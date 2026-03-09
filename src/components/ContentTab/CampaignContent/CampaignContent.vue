<template>
  <!-- For some reason, submitting this form (and only this form, not any of the other content forms) by hitting enter in the name input crashes the browser -->
  <form @submit.prevent="">
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow" style="margin-bottom: .625rem;">
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
      </header>
      <ContentTabStrip 
        default-tab="description"
        :tabs="tabs" 
      >
        <DescriptionTab 
          :name="currentCampaign?.name || 'Campaign'"
          :image-url="currentCampaign?.img"
          :window-type="WindowTabType.Campaign"
          :show-image="ModuleSettings.get(SettingKey.showImages)?.campaigns ?? true"
          @image-change="onImageChange"
        >
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.campaignDescription"
              top-label
            />
          </div>
          <div class="flexrow form-group">
            <Editor 
              :initial-content="currentCampaign?.description || ''"
              :fixed-height="descriptionHeight"
              :resizable="true"
              :current-entity-uuid="currentCampaign?.uuid"
              @editor-saved="onDescriptionEditorSaved"
              @editor-resized="onDescriptionEditorResized"
            />
          </div>

          <CustomFieldsBlocks
            v-if="currentCampaign"
            :content-type="CustomFieldContentType.Campaign"
          />
        </DescriptionTab>
        <JournalTab
          v-if="currentCampaign && tabVisibility[TabVisibilityItem.CampaignJournals]"
          :initial-journals="currentCampaign.journals"
          @journals-updated="onJournalsUpdate"
        />
        <div 
          v-if="tabVisibility[TabVisibilityItem.CampaignPCs]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="pcs"
        >
          <div class="tab-inner">
            <CampaignPCsTab />
          </div>
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.CampaignLore]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="lore"
        >
          <div class="tab-inner">
            <CampaignLoreTab />
          </div>
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.CampaignIdeas]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="ideas"
        >
          <div class="tab-inner">
            <CampaignIdeasTab />
          </div>
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.CampaignStoryWebs] && ModuleSettings.get(SettingKey.useStoryWebs)"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="storyWebs"
        >
          <div class="tab-inner">
            <StoryWebsTab mode="campaign" />
          </div>
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.CampaignToDo] && ModuleSettings.get(SettingKey.enableToDoList)"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="toDo"
        >
          <div class="tab-inner">
            <CampaignToDoTab />
          </div>
        </div>
        <div v-if="showTimelineTab" class="tab flexcol" data-group="primary" data-tab="timeline">
          <div class="tab-inner">
            <TimelineTab />
          </div>
        </div>
      </ContentTabStrip> 
    </div>
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { ref, watch, computed, provide, onBeforeUnmount, } from 'vue';

  // local imports
  import { getTabTypeIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useNavigationStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { useCampaignDerivedState, CAMPAIGN_DERIVED_STATE_KEY } from '@/composables/useCampaignDerivedState';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { notifyWarn } from '@/utils/notifications';
  import { calendariaAvailable, calendarActive } from '@/utils/calendar/calendarState';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import Editor from '@/components/Editor.vue';
  import CampaignPCsTab from '@/components/ContentTab/CampaignContent/CampaignPCsTab.vue';
  import CampaignLoreTab from '@/components/ContentTab/CampaignContent/CampaignLoreTab.vue';
  import CampaignIdeasTab from '@/components/ContentTab/CampaignContent/CampaignIdeasTab.vue';
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue';
  import JournalTab from '@/components/ContentTab/JournalTab.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import CampaignToDoTab from '@/components/ContentTab/CampaignContent/CampaignToDoTab.vue';
  import ContentTabStrip from '@/components/ContentTab/ContentTabStrip.vue';
  import StoryWebsTab from '@/components/ContentTab/StoryWebsTab.vue';
  import CustomFieldsBlocks from '@/components/CustomFieldsBlocks.vue';
  import TimelineTab from '@/components/ContentTab/TimelineTab.vue';

  // types
  import { CustomFieldContentType, RelatedJournal, WindowTabType, TabVisibilityItem, } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentCampaign } = useContentState();

  // per-panel derived state for campaign content
  const campaignDerivedState = useCampaignDerivedState();
  provide(CAMPAIGN_DERIVED_STATE_KEY, campaignDerivedState);
  const { toDoRows } = campaignDerivedState;

  ////////////////////////////////
  // data

  const name = ref<string>('');

  const icon =  getTabTypeIcon(WindowTabType.Campaign);
   const descriptionHeight = ref<number>(15);  // for handling description editor height

  ////////////////////////////////
  // computed data
  const namePlaceholder = computed((): string => (localize('placeholders.campaignName') || ''));

  // Get tab visibility settings
  const tabVisibility = computed(() => {
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tabVisibilitySettings);
  });


  const showTimelineTab = computed(() => {
    return ModuleSettings.get(SettingKey.useTimeline) && 
      calendariaAvailable.value && 
      calendarActive.value;
  });

  const openToDoCount = computed(() => toDoRows.value.length);

  const tabs = computed(() => {
    const baseTabs = [
      { id: 'description', label: localize('labels.description') },
    ];

    if (tabVisibility.value[TabVisibilityItem.CampaignJournals]) {
      baseTabs.push({ id: 'journals', label: localize('labels.journals') });
    }
    if (tabVisibility.value[TabVisibilityItem.CampaignPCs]) {
      baseTabs.push({ id: 'pcs', label: localize('labels.tabs.campaign.pcs') });
    }
    if (tabVisibility.value[TabVisibilityItem.CampaignLore]) {
      baseTabs.push({ id: 'lore', label: localize('labels.tabs.campaign.lore') });
    }
    if (tabVisibility.value[TabVisibilityItem.CampaignIdeas]) {
      baseTabs.push({ id: 'ideas', label: localize('labels.tabs.campaign.ideas') });
    }
    if (tabVisibility.value[TabVisibilityItem.CampaignToDo] && ModuleSettings.get(SettingKey.enableToDoList)) {
      const baseLabel = localize('labels.tabs.campaign.toDo');
      const label = openToDoCount.value ? `${baseLabel} (${openToDoCount.value})` : baseLabel;
      baseTabs.push({ id: 'toDo', label });
    }
    if (ModuleSettings.get(SettingKey.useStoryWebs) && tabVisibility.value[TabVisibilityItem.CampaignStoryWebs]) {
      baseTabs.push({ id: 'storyWebs', label: localize('contentFolders.storyWebs') });
    }

    if (showTimelineTab.value && tabVisibility.value[TabVisibilityItem.CampaignTimeline]) {
      baseTabs.push({ id: 'timeline', label: localize('labels.tabs.campaign.timeline') });
    }

    return baseTabs;
  });


  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  const onDescriptionEditorResized = async (height: number) => {
    if (!currentCampaign.value)
      return;
    
    descriptionHeight.value = height;
    currentCampaign.value?.setCustomFieldHeight('###description###', height);
    await currentCampaign.value?.save();
  };

  // debounce changes to name
  let debounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('notifications.nameRequired'));
        name.value = currentCampaign.value?.name!;
        return;
      }

      if (currentCampaign.value && currentCampaign.value.name!==newValue) {
        currentCampaign.value.name = newValue;
        await currentCampaign.value.save();

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentCampaign.value.uuid]);
        await navigationStore.propagateNameChange(currentCampaign.value.uuid, newValue);
      }
    }, debounceTime);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentCampaign.value)
      return;

    currentCampaign.value.description = newContent;
    await currentCampaign.value.save();
  };

  const onImageChange = async (imageUrl: string) => {
    if (currentCampaign.value) {
      currentCampaign.value.img = imageUrl;
      await currentCampaign.value.save();
    }
  }

  const onJournalsUpdate = async (newJournals: RelatedJournal[]) => {
    if (currentCampaign.value) {
      currentCampaign.value.journals = newJournals;
      await currentCampaign.value.save();
    }
  };

  ////////////////////////////////
  // watchers
  watch(currentCampaign, async (): Promise<void> => {
    if (!currentCampaign.value)
      return;

    // load starting data values
    name.value = currentCampaign.value.name || '';
    descriptionHeight.value = currentCampaign.value.getCustomFieldHeight('###description###') || 15;
  });

  ////////////////////////////////
  // lifecycle events
  onBeforeUnmount(() => {
    // Clear debounce timer to prevent saves after unmount
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  });

</script>

<style lang="scss">
  .fcb-sheet-subtab-container {
    flex: 1;
    min-height: 0;
    display: flex;
    padding-bottom: 10px;
  }

  .fcb-subtab-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .fcb-tab-body {
    flex: 1;
    min-height: 0;
  }
</style>