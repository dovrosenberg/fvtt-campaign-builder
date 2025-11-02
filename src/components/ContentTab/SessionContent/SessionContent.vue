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
          :tag-setting="SettingKey.sessionTags"
          @tag-added="onTagChange"
          @tag-removed="onTagChange"
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

          <!-- we put strong start at the top until the session has been played -->
          <template v-if="strongStartAtTop">
            <div class="flexrow form-group">
              <LabelWithHelp
                label-text="labels.session.strongStart"
                help-text="labels.session.strongStartHelpText"
                @click="onStartHelpClick"
              />
            </div>
            <div class="flexrow form-group">
              <!-- Use a key so it doesn't try to reuse; that was causing issues when it moved around -->
              <Editor 
                :key="`strong-start-${currentSession?.uuid}-top`"
                :initial-content="strongStartContent"
                fixed-height="180px"
                :current-entity-uuid="currentSession?.uuid"
                @editor-saved="onStartEditorSaved"
              />
            </div>
          </template>

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
              @editor-saved="onNotesEditorSaved"
            />
          </div>

          <!-- we put strong start at the top until the session has been played -->
          <template v-if="!strongStartAtTop">
            <div class="flexrow form-group">
              <LabelWithHelp
                label-text="labels.session.strongStart"
                help-text="labels.session.strongStartHelpText"
                @click="onStartHelpClick"
              />
            </div>
            <div class="flexrow form-group">
              <!-- Use a key so it doesn't try to reuse; that was causing issues when it moved around -->
              <Editor 
                :key="`strong-start-${currentSession?.uuid}-bottom`"
                :initial-content="strongStartContent"
                fixed-height="180px"
                :current-entity-uuid="currentSession?.uuid"
                @editor-saved="onStartEditorSaved"
              />
            </div>
          </template>

        </DescriptionTab>
        <div class="tab flexcol" data-group="primary" data-tab="pcs">
          <div class="tab-inner">
            <CampaignPCsTab />
          </div>
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="npcs">
          <div class="tab-inner">
            <SessionNPCTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="vignettes">
          <div class="tab-inner">
            <SessionVignetteTab />
          </div>  
        </div>

        <div class="tab flexcol" data-group="primary" data-tab="lore">
          <div class="tab-inner">
            <SessionLoreTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner">
            <SessionLocationTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="monsters">
          <div class="tab-inner">
            <SessionMonsterTab />
          </div>  
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="magic">
          <div class="tab-inner">
            <SessionItemTab />
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
  import { useMainStore, useCampaignDirectoryStore, useNavigationStore, usePlayingStore, } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';
  import { localize } from '@/utils/game'
  import { SettingKey, } from '@/settings';
  import { notifyWarn } from '@/utils/notifications';

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
  
  // types
  import { ContentTabDescriptor, WindowTabType } from '@/types';
  import { Session } from '@/classes';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const playingStore = usePlayingStore();
  const { currentSession, currentContentTab, isInPlayMode } = storeToRefs(mainStore);
  const { currentPlayedSessionId, currentPlayedSessionNotes } = storeToRefs(playingStore);
  
  ////////////////////////////////
  // data
  const name = ref<string>('');
  const sessionNumber = ref<string>('');
  const sessionDate = ref<Date | undefined>(undefined);
  const sessionNotesContent = ref<string>('');
  const strongStartContent = ref<string>('');

  ////////////////////////////////
  // computed data
  const strongStartAtTop = computed(() => {
    // we put it at the top if this is the last session for its campaign
    const campaign = currentSession.value?.campaign;
    const campaignLastSessionNumber = campaign?.currentSessionNumber;

    return campaignLastSessionNumber == null || !currentSession.value || currentSession.value.number === campaignLastSessionNumber; 
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
      const newValue = isNaN(parseInt(newNumber || '')) ? null : parseInt(newNumber as string);

      if (newValue != null && currentSession.value && currentSession.value.number!==newValue) {
        currentSession.value.number = newValue;
        await currentSession.value.save();

        // the save may renumber a bunch of things, so need to refresh the campaign directory tree (every node with a number >= the new number)
        const sessionsToRefresh = currentSession.value.campaign?.sessionIndex.filter(s=> s.number>=newValue) || [];

        await campaignDirectoryStore.refreshCampaignDirectoryTree(sessionsToRefresh.map(s=> s.uuid));
        await navigationStore.propagateNameChange(currentSession.value.uuid, `${localize('labels.session.session')} ${newValue.toString()}`);
      }
    }, debounceTime);
  };

  const onStartHelpClick = () => {
    window.open('https://slyflourish.com/starting_strong.html', '_blank');
  }

  const onNotesEditorSaved = async (newContent: string) => {
    if (!currentSession.value)
      return;

    currentSession.value.notes = newContent;
    await currentSession.value.save();

    mainStore.refreshSession();

    // trigger reactivity on the session notes window if needed
    if (currentPlayedSessionId.value===currentSession.value.uuid) {
      currentPlayedSessionNotes.value = newContent;
    }
  };

  const onStartEditorSaved = async (newContent: string) => {
    if (!currentSession.value)
      return;

    currentSession.value.strongStart = newContent;
    await currentSession.value.save();

    mainStore.refreshSession();
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
      }
    }, debounceTime);
  });

  watch(currentSession, async (newSession: Session | null): Promise<void> => {
    if (newSession && newSession.uuid) {
      // load starting data values
      name.value = newSession.name || '';
      sessionNumber.value = newSession.number?.toString() || '';
      sessionDate.value = newSession.date || undefined;
      sessionNotesContent.value = newSession.notes || '';
      strongStartContent.value = newSession.strongStart || '';
    }
  });
  
  // watch for changes to the notes
  watch(() => currentPlayedSessionNotes.value, async (newNotes) => {
    if (currentSession.value && currentSession.value.uuid===currentPlayedSessionId.value) {
      // If notes are null (exiting play mode), reload from database to get actual saved notes
      // Otherwise just update the display with the new notes value
      if (newNotes === null) {
        await mainStore.refreshSession(true);  // reload from database
        sessionNotesContent.value = currentSession.value?.notes || '';
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