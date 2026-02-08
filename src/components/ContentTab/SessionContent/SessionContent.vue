<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${getTabTypeIcon(WindowTabType.Session)} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name" 
          class="fcb-input-name"
          unstyled
          :placeholder="localize('placeholders.sessionName')"
          :pt="{
            root: { class: 'full-height' } 
          }" 
          @update:model-value="onNameUpdate"
        />
      </header>
      <div class="flexrow">
        <Tags
          v-if="currentSession"
          v-model="currentSession.tags"
          :tag-setting="SettingKey.contentTags"
          @tag-added="onTagChange"
          @tag-removed="onTagChange"
          @tag-click="onTagClick"
        />
      </div>
      <ContentTabStrip 
        :tabs="tabs" 
        default-tab="notes"
      >
        <DescriptionTab
          :name="currentSession?.name || 'Session'"
          :image-url="currentSession?.img"
          :window-type="WindowTabType.Session"
          :show-image="ModuleSettings.get(SettingKey.showImages)?.sessions ?? true"
          alt-tab-id="notes"
          @image-change="onImageChange"
        >
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.sessionNumber"
            />
            <InputText
              v-model="sessionNumber"
              for="fcb-input-number" 
              unstyled
              :placeholder="localize('placeholders.sessionNumber')"
              :disabled=isInPlayMode
              :pt="{
                root: { class: 'full-height' } 
              }" 
              @update:model-value="onNumberUpdate"
            />
          </div>
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.sessionDate"
            />
            <DatePicker 
              v-model="sessionDate"
              :show-button-bar="true"
            />   
          </div>
          <!-- spacer -->
          <div style="height: 1rem"></div>

          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.tabs.session.notes"
            />
          </div>
          <div class="flexrow form-group">
            <Editor 
              :initial-content="sessionNotesContent"
              fixed-height="400px"
              :current-entity-uuid="currentSession?.uuid"
              @related-entries-changed="onRelatedEntriesChanged"
              @editor-saved="onNotesEditorSaved"
            />
          </div>

          <CustomFieldsBlocks
            v-if="currentSession"
            :content-type="CustomFieldContentType.Session"
            @related-entries-changed="onRelatedEntriesChanged"
          />
        </DescriptionTab>
        <div class="tab flexcol" data-group="primary" data-tab="pcs">
          <div class="tab-inner">
            <CampaignPCsTab />
          </div>
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="npcs">
          <div class="tab-inner">
            <SessionNPCTab 
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="vignettes">
          <div class="tab-inner">
            <SessionVignetteTab 
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>

        <div class="tab flexcol" data-group="primary" data-tab="lore">
          <div class="tab-inner">
            <SessionLoreTab 
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner">
            <SessionLocationTab 
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="monsters">
          <div class="tab-inner">
            <SessionMonsterTab 
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="magic">
          <div class="tab-inner">
            <SessionItemTab 
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>  
        </div>
        <div v-if="showStoryWebTab" class="tab flexcol" data-group="primary" data-tab="storyWebs">
          <div class="tab-inner">
            <StoryWebsTab mode="session" />
          </div>
        </div>
      </ContentTabStrip>
    </div>
  </form>	 

  <!-- Related Items Management Dialog -->
  <RelatedEntriesManagementDialog
    v-model="showRelatedEntriesDialog"
    :description="localize('dialogs.relatedEntriesManagement.sessionDescription')"
    :added-ids="pendingAddedUUIDs"
    :removed-ids="pendingRemovedUUIDs"
    @update="onRelatedEntriesDialogUpdate"
  />

</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';
  import { ref, watch, onBeforeUnmount, computed, } from 'vue';

  // local imports
  import { useMainStore, useCampaignDirectoryStore, useNavigationStore, usePlayingStore, useSessionStore, } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { getTabTypeIcon } from '@/utils/misc';
  import { localize } from '@/utils/game'
  import { notifyWarn } from '@/utils/notifications';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { getSessionRelatedEntries } from '@/utils/uuidExtraction';
  import { filterRelatedEntries } from '@/utils/relatedContent';

  // library components
  import InputText from 'primevue/inputtext';
  import DatePicker from 'primevue/datepicker';
  
  // local components
  import CampaignPCsTab from '@/components/ContentTab/CampaignContent/CampaignPCsTab.vue';
  import Editor from '@/components/Editor.vue';
  import SessionLocationTab from '@/components/ContentTab/SessionContent/SessionLocationTab.vue';
  import SessionItemTab from '@/components/ContentTab/SessionContent/SessionItemTab.vue';
  import SessionNPCTab from '@/components/ContentTab/SessionContent/SessionNPCTab.vue';
  import SessionMonsterTab from '@/components/ContentTab/SessionContent/SessionMonsterTab.vue';
  import SessionVignetteTab from '@/components/ContentTab/SessionContent/SessionVignetteTab.vue';
  import SessionLoreTab from '@/components/ContentTab/SessionContent/SessionLoreTab.vue';
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue'; 
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import Tags from '@/components/Tags.vue';
  import ContentTabStrip from '@/components/ContentTab/ContentTabStrip.vue';
  import StoryWebsTab from '@/components/ContentTab/StoryWebsTab.vue';
  import CustomFieldsBlocks from '@/components/CustomFieldsBlocks.vue';
  import RelatedEntriesManagementDialog from '@/components/RelatedEntriesManagementDialog.vue';

  // types
  import { ContentTabDescriptor, CustomFieldContentType, Topics, WindowTabType } from '@/types';
  import { Entry, Session } from '@/classes';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const sessionStore = useSessionStore();
  const playingStore = usePlayingStore();
  const { isInPlayMode } = storeToRefs(mainStore);
  const { currentSetting, currentSession } = useContentState();
  const { currentPlayedSessionId, currentPlayedSessionNotes } = storeToRefs(playingStore);
  
  ////////////////////////////////
  // data
  const name = ref<string>('');
  const sessionNumber = ref<string>('');
  const sessionDate = ref<Date | undefined>(undefined);
  const sessionNotesContent = ref<string>('');
  const showRelatedEntriesDialog = ref<boolean>(false);
  const pendingAddedUUIDs = ref<string[]>([]);
  const pendingRemovedUUIDs = ref<string[]>([]);

  ////////////////////////////////
  // computed data
  const showStoryWebTab = computed(() => {
    return ModuleSettings.get(SettingKey.useWebs);
  });

  const tabs = computed(() => [
    { id: 'notes', label: localize('labels.tabs.session.notes')},
    { id: 'lore', label: localize('labels.tabs.session.lore')},
    { id: 'vignettes', label: localize('labels.tabs.session.vignettes')},
    { id: 'locations', label: localize('labels.tabs.session.locations')},
    { id: 'npcs', label: localize('labels.tabs.session.npcs')},
    { id: 'monsters', label: localize('labels.tabs.session.monsters')},
    { id: 'magic', label: localize('labels.tabs.session.magic')},
    { id: 'pcs', label: localize('labels.tabs.session.pcs')},
    ...(showStoryWebTab.value ? [{ id: 'storyWebs', label: localize('contentFolders.storyWebs') }] : []),
  ] as ContentTabDescriptor[]);

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  // debounce changes to name/number/strong start
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;
  let numberDebounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('errors.nameRequired'));
        name.value = currentSession.value?.name!;
        return;
      }

      if (currentSession.value && currentSession.value.name!==newValue) {
        currentSession.value.name = newValue;
        await currentSession.value.save();

        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentSession.value.uuid]);
        await navigationStore.propagateNameChange(currentSession.value.uuid, newValue);
      }
    }, debounceTime);
  };

  // we do a really long debounce here because changing it too soon will be hard to undo because all of the renumbering
  const onNumberUpdate = (newNumber: string | undefined) => {
    const debounceTime = 1000;
  
    clearTimeout(numberDebounceTimer);
    
    numberDebounceTimer = setTimeout(async () => {
      if (!currentSession.value)
        return;
      
      const newValue = isNaN(parseInt(newNumber || '')) ? null : parseInt(newNumber as string);

      if (newValue != null && currentSession.value.number!==newValue) {
        currentSession.value.number = newValue;
        await currentSession.value.save();

        // the save may renumber a bunch of things and affect multiple arcs, so refresh all arcs
        await currentSession.value.loadCampaign();
        const updateIds = currentSession.value.campaign!.arcIndex.map(arc => arc.uuid).concat(currentSession.value.uuid);
        await campaignDirectoryStore.refreshCampaignDirectoryTree(updateIds);

        await navigationStore.propagateNameChange(currentSession.value.uuid, `${localize('labels.session.session')} ${newValue.toString()}`);
      } else {
        // restore the old one
        sessionNumber.value = currentSession.value.number.toString();
      }
    }, debounceTime);
  };

  const onNotesEditorSaved = async (newContent: string) => {
    if (!currentSession.value)
      return;

    currentSession.value.description = newContent;
    await currentSession.value.save();

    mainStore.refreshSession();

    // trigger reactivity on the session notes window if needed
    if (currentPlayedSessionId.value===currentSession.value.uuid) {
      currentPlayedSessionNotes.value = newContent;
    }
  };

  const onImageChange = async (imageUrl: string) => {
    if (currentSession.value) {
      currentSession.value.img = imageUrl;
      await currentSession.value.save();
    }
  }

  // we can use this for add and remove because the change was already passed back to 
  //    currentSession - we just need to save
  const onTagChange = async (): Promise<void> => {
    if (!currentSession.value)
      return;
    await currentSession.value.save();
  }

  const onTagClick = async (tagName: string): Promise<void> => {
    // Open the tag results tab for the clicked tag
    await navigationStore.openTagResults(tagName, { newTab: true, activate: true });
  }

  const onRelatedEntriesChanged = async (addedUUIDs: string[], removedUUIDs: string[]) => {
    if (!currentSession.value || !currentSetting.value || !ModuleSettings.get(SettingKey.autoRelationships)) {
      return;
    }

    // get the entries we actually need to check
    const { added, removed } = await getSessionRelatedEntries(addedUUIDs, removedUUIDs, currentSession.value);

    // locations and characters can be linked
    await filterRelatedEntries(currentSetting.value, added, removed, [Topics.Location, Topics.Character]);

    // Store the pending changes and show dialog if there are any changes
    if (added.length > 0 || removed.length > 0) {
      pendingAddedUUIDs.value = added;
      pendingRemovedUUIDs.value = removed;
      showRelatedEntriesDialog.value = true;
    }
  };

  const onRelatedEntriesDialogUpdate = async (addedEntries: Entry[], removedEntries: Entry[]) => {
    if (!currentSession.value) 
      return;

    // characters go into NPCs and locations go into locations
    // Handle added relationships
    for (const entry of addedEntries) {
      if (entry.topic === Topics.Character) {
        await sessionStore.addNPC(entry.uuid);
      } else if (entry.topic === Topics.Location) {
        await sessionStore.addLocation(entry.uuid);
      }
    }

    // Handle removed relationships
    for (const entry of removedEntries) {
      if (entry.topic === Topics.Character) {
        await sessionStore.deleteNPC(entry.uuid, true);
      } else if (entry.topic === Topics.Location) {
        await sessionStore.deleteLocation(entry.uuid, true);
      }
    }
  };

  ////////////////////////////////
  // watchers
  let dateDebounceTimer: NodeJS.Timeout | undefined = undefined;
  watch(sessionDate, async (newDate: Date | undefined): Promise<void> => {
    const debounceTime = 500;
  
    clearTimeout(dateDebounceTimer);
    
    dateDebounceTimer = setTimeout(async () => {
      if (currentSession.value && currentSession.value.date?.toISOString()!==newDate?.toISOString()) {
        currentSession.value.date = newDate || null;
        await currentSession.value.save();
        await campaignDirectoryStore.refreshCampaignDirectoryTree([currentSession.value.uuid]);
      }
    }, debounceTime);
  });

  watch(currentSession, async (newSession: Session | null): Promise<void> => {
    if (newSession && newSession.uuid) {
      // load starting data values
      name.value = newSession.name || '';
      sessionNumber.value = newSession.number?.toString() || '';
      sessionDate.value = newSession.date || undefined;
      sessionNotesContent.value = newSession.description || '';
    }
  });
  
  // watch for changes to the notes
  watch(() => currentPlayedSessionNotes.value, async (newNotes) => {
    if (currentSession.value && currentSession.value.uuid===currentPlayedSessionId.value) {
      // If notes are null (exiting play mode), reload from database to get actual saved notes
      // Otherwise just update the display with the new notes value
      if (newNotes === null) {
        await mainStore.refreshSession(true);  // reload from database
        sessionNotesContent.value = currentSession.value?.description || '';
      } else {
        await mainStore.refreshSession();  // update the screen
        sessionNotesContent.value = newNotes || '';
      }
    }

  }, { immediate: true });

  // Watch for changes to the played session (which might include a refresh  
  // so we need to update the standalone notes window)
  // watch(() => currentPlayedSessionId.value, async () => {
  //   if (currentPlayedSessionId.value === currentSession.value?.uuid) 
  //     sessionNotesContent.value = currentPlayedSessionNotes.value || '';
  // }, { immediate: true });



  ////////////////////////////////
  // cleanup timers on unmount
  onBeforeUnmount(() => {
    clearTimeout(nameDebounceTimer);
    clearTimeout(numberDebounceTimer);
    clearTimeout(dateDebounceTimer);
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