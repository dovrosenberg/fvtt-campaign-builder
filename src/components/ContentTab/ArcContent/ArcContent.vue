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
          @tag-added="onTagChange"
          @tag-removed="onTagChange"
          @tag-click="onTagClick"
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
              :fixed-height="descriptionHeight"
              :resizable="true"
              :current-entity-uuid="currentArc?.uuid"
              @related-entries-changed="onRelatedEntriesChanged"
              @editor-saved="onDescriptionEditorSaved"
              @editor-resized="onDescriptionEditorResized"
            />
          </div>

          <CustomFieldsBlocks
            v-if="currentArc"
            :content-type="CustomFieldContentType.Arc"
            @related-entries-changed="onRelatedEntriesChanged"
          />
        </DescriptionTab>
        <JournalTab
          v-if="currentArc && tabVisibility[TabVisibilityItem.ArcJournals]"
          :initial-journals="currentArc.journals"
          @journals-updated="onJournalsUpdate"
        />
        <div 
          v-if="tabVisibility[TabVisibilityItem.ArcParticipants]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="participants"
        >
          <div class="tab-inner">
            <ArcParticipantTab 
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.ArcLore]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="lore"
        >
          <div class="tab-inner">
            <SessionLoreTab 
              :arc-mode="true"
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.ArcVignettes]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="vignettes"
        >
          <div class="tab-inner">
            <SessionVignetteTab 
              :arc-mode="true"
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.ArcLocations]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="locations"
        >
          <div class="tab-inner">
            <SessionLocationTab 
              :arc-mode="true"
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.ArcMonsters]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="monsters"
        >
          <div class="tab-inner">
            <SessionMonsterTab 
              :arc-mode="true"
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.ArcItems]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="items"
        >
          <div class="tab-inner">
            <SessionItemTab 
              :arc-mode="true"
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.ArcIdeas]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="ideas"
        >
          <div class="tab-inner">
            <CampaignIdeasTab 
              :arc-mode="true"
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div 
          v-if="ModuleSettings.get(SettingKey.useStoryWebs) && tabVisibility[TabVisibilityItem.ArcStoryWebs]" 
          class="tab flexcol" 
          data-group="primary" 
          data-tab="storyWebs"
        >
          <div class="tab-inner">
            <StoryWebsTab mode="arc" />
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

  <!-- Related Items Management Dialog -->
  <RelatedEntriesManagementDialog
    v-model="showRelatedEntriesDialog"
    :description="localize('dialogs.relatedEntriesManagement.arcDescription')"
    :added-ids="pendingAddedUUIDs"
    :removed-ids="pendingRemovedUUIDs"
    @update="onRelatedEntriesDialogUpdate"
  />

</template>

<script setup lang="ts">

  // library imports
  import { ref, watch, onBeforeUnmount, computed, provide, } from 'vue';

  // local imports
  import { useMainStore, useCampaignDirectoryStore, useNavigationStore, useArcStore, } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { useArcDerivedState, ARC_DERIVED_STATE_KEY } from '@/composables/useArcDerivedState';
  import { getTabTypeIcon } from '@/utils/misc';
  import { localize } from '@/utils/game'
  import { ModuleSettings, SettingKey } from '@/settings';
  import { notifyWarn } from '@/utils/notifications';
  import { getArcRelatedEntries } from '@/utils/uuidExtraction';
  import { filterRelatedEntries } from '@/utils/relatedContent';
  import { calendariaAvailable, calendarActive } from '@/utils/calendar/calendarState';

  // library components
  import InputText from 'primevue/inputtext';
  
  // local components
  import Editor from '@/components/Editor.vue';
  import SessionLocationTab from '@/components/ContentTab/SessionContent/SessionLocationTab.vue';
  import ArcParticipantTab from '@/components/ContentTab/ArcContent/ArcParticipantTab.vue';
  import SessionMonsterTab from '@/components/ContentTab/SessionContent/SessionMonsterTab.vue';
  import SessionItemTab from '@/components/ContentTab/SessionContent/SessionItemTab.vue';
  import SessionLoreTab from '@/components/ContentTab/SessionContent/SessionLoreTab.vue';
  import SessionVignetteTab from '@/components/ContentTab/SessionContent/SessionVignetteTab.vue';
  import CampaignIdeasTab from '@/components/ContentTab/CampaignContent/CampaignIdeasTab.vue';
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue'; 
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import JournalTab from '@/components/ContentTab/JournalTab.vue';
  import Tags from '@/components/Tags.vue';
  import ContentTabStrip from '@/components/ContentTab/ContentTabStrip.vue';
  import StoryWebsTab from '@/components/ContentTab/StoryWebsTab.vue';
  import CustomFieldsBlocks from '@/components/CustomFieldsBlocks.vue';
  import RelatedEntriesManagementDialog from '@/components/dialogs/RelatedEntriesManagementDialog.vue';
  import TimelineTab from '@/components/ContentTab/TimelineTab.vue';

  // types
  import { ContentTabDescriptor, CustomFieldContentType, Topics, WindowTabType, TabVisibilityItem, RelatedJournal } from '@/types';
  import { Arc, Entry } from '@/classes';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const arcStore = useArcStore();
  const { currentArc, currentSetting } = useContentState();
  const arcDerivedState = useArcDerivedState();
  provide(ARC_DERIVED_STATE_KEY, arcDerivedState);

  ////////////////////////////////
  // data
  const name = ref<string>('');
  const descriptionContent = ref<string>('');
  const showRelatedEntriesDialog = ref<boolean>(false);
  const pendingAddedUUIDs = ref<string[]>([]);
  const pendingRemovedUUIDs = ref<string[]>([]);
  const descriptionHeight = ref<number>(15);  // for handling description editor height

  ////////////////////////////////
  // computed data
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

  const tabs = computed(() => {
    const baseTabs = [
      { id: 'description', label: localize('labels.description')},
    ];

    if (tabVisibility.value[TabVisibilityItem.ArcJournals]) {
      baseTabs.push({ id: 'journals', label: localize('labels.journals') });
    }
    if (tabVisibility.value[TabVisibilityItem.ArcLore]) {
      baseTabs.push({ id: 'lore', label: localize('labels.tabs.arc.lore')});
    }
    if (tabVisibility.value[TabVisibilityItem.ArcVignettes]) {
      baseTabs.push({ id: 'vignettes', label: localize('labels.tabs.arc.vignettes')});
    }
    if (tabVisibility.value[TabVisibilityItem.ArcLocations]) {
      baseTabs.push({ id: 'locations', label: localize('labels.tabs.arc.locations')});
    }
    if (tabVisibility.value[TabVisibilityItem.ArcParticipants]) {
      baseTabs.push({ id: 'participants', label: localize('labels.tabs.arc.participants')});
    }
    if (tabVisibility.value[TabVisibilityItem.ArcMonsters]) {
      baseTabs.push({ id: 'monsters', label: localize('labels.tabs.arc.monsters')});
    }
    if (tabVisibility.value[TabVisibilityItem.ArcItems]) {
      baseTabs.push({ id: 'items', label: localize('labels.tabs.arc.items')});
    }
    if (tabVisibility.value[TabVisibilityItem.ArcIdeas]) {
      baseTabs.push({ id: 'ideas', label: localize('labels.tabs.arc.ideas')});
    }
    if (ModuleSettings.get(SettingKey.useStoryWebs) && tabVisibility.value[TabVisibilityItem.ArcStoryWebs]) {
      baseTabs.push({ id: 'storyWebs', label: localize('contentFolders.storyWebs') });
    }
    if (showTimelineTab.value && tabVisibility.value[TabVisibilityItem.ArcTimeline]) {
      baseTabs.push({ id: 'timeline', label: localize('labels.tabs.arc.timeline') });
    }
    return baseTabs as ContentTabDescriptor[];
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDescriptionEditorResized = async (height: number) => {
    if (!currentArc.value)
      return;
    
    descriptionHeight.value = height;
    currentArc.value?.setCustomFieldHeight('###description###', height);
    await currentArc.value?.save();
  };

  // debounce changes to name/number/strong start
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('notifications.nameRequired'));
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

  const onJournalsUpdate = async (newJournals: RelatedJournal[]) => {
    if (currentArc.value) {
      currentArc.value.journals = newJournals;
      await currentArc.value.save();
    }
  };

  // we can use this for add and remove because the change was already passed back to 
  //    currentArc - we just need to save
  const onTagChange = async (): Promise<void> => {
    if (!currentArc.value)
      return;
    await currentArc.value.save();
  }

  const onTagClick = async (tagName: string): Promise<void> => {
    // Open the tag results tab for the clicked tag
    await navigationStore.openTagResults(tagName, { newTab: true, activate: true });
  }

  const onRelatedEntriesChanged = async (addedUUIDs: string[], removedUUIDs: string[]) => {
    if (!currentArc.value || !currentSetting.value) {
      return;
    }

    // get the entries we actually need to check
    const { added, removed } = await getArcRelatedEntries(addedUUIDs, removedUUIDs, currentArc.value);

    // locations and characters/organizations can be linked
    await filterRelatedEntries(currentSetting.value, added, removed, [Topics.Location, Topics.Character, Topics.Organization]);

    // Store the pending changes and show dialog if there are any changes
    if (added.length > 0 || removed.length > 0) {
      pendingAddedUUIDs.value = added;
      pendingRemovedUUIDs.value = removed;
      showRelatedEntriesDialog.value = true;
    }
  };

  const onRelatedEntriesDialogUpdate = async (addedEntries: Entry[], removedEntries: Entry[]) => {
    if (!currentArc.value) 
      return;

    // locations go into locations, characters and organizations go into participants
    // Handle added relationships
    for (const entry of addedEntries) {
      if (entry.topic === Topics.Location) {
        await arcStore.addLocation(entry.uuid);
      } else if (entry.topic === Topics.Character || entry.topic === Topics.Organization) {
        await arcStore.addParticipant(entry.uuid);
      }
    }

    // Handle removed relationships - skip confirmation since user already confirmed via the dialog
    for (const entry of removedEntries) {
      if (entry.topic === Topics.Location) {
        await arcStore.deleteLocation(entry.uuid, true);
      } else if (entry.topic === Topics.Character || entry.topic === Topics.Organization) {
        await arcStore.deleteParticipant(entry.uuid, true);
      }
    }
  };

  ////////////////////////////////
  // watchers
  watch(currentArc, async (newArc: Arc | null): Promise<void> => {
    if (newArc && newArc.uuid) {
      // load starting data values
      name.value = newArc.name || '';
      descriptionContent.value = newArc.description || '';
      descriptionHeight.value = newArc.getCustomFieldHeight('###description###') || 15;
    }
  }, { immediate: true });
  

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