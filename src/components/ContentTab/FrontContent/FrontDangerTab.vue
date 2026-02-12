<template>
  <div class="fcb-description-wrapper flexrow">
    <div class="fcb-sheet-container flexcol" style="overflow-y: visible">
      <header class="fcb-name-header flexrow">
        <InputText
          v-model="name"
          for="fcb-input-name" 
          class="fcb-input-sub-name"
          unstyled
          :placeholder="localize('placeholders.dangerName')"
          :pt="{
            root: { class: 'full-height' } 
          }" 
          @update:model-value="onNameUpdate"
        />
      </header>
      
      <Panel
        header="Overview"
        toggleable
        :pt="{
          root: {
            style: {'margin-top': '0.5em' },
          },
        }"
      >        
        <!-- Description -->
        <div class="flexrow form-group">
          <LabelWithHelp
            label-text="labels.description"
            top-label
          />
        </div>

        <div class="flexrow form-group" style="margin-top: 1rem">
          <Editor
            :initial-content="currentDanger?.description || ''"
            fixed-height="8"
            :current-entity-uuid="currentFront?.uuid"
            @related-entries-changed="onRelatedEntriesChanged"
            @editor-saved="onDescriptionEditorSaved"
          />
        </div>

        <!-- Impending Doom -->
        <div class="flexrow form-group">
          <LabelWithHelp
            label-text="labels.front.impendingDoom"
          />
          <TextArea
            v-model="impendingDoom"
            rows="3"
            data-testid="danger-impending-doom"
            unstyled
            style="width: calc(100% - 2px); font-family: var(--fcb-font-family)"
            @update:model-value="onImpendingDoomUpdate"
          />
        </div>
      </Panel>
      
      <!-- Participants -->
      <Panel
        :header="localize('labels.front.participants')"
        toggleable
        :pt="{
          root: {
            style: {'margin-top': '0.5em' },
          },
        }"
      >
        <DangerParticipantTable/>
      </Panel>
      
      <!-- Motivation -->
      <Panel
        :header="localize('labels.front.motivation')"
        toggleable
        :pt="{
          root: {
            style: {'margin-top': '0.5em' },
          },
        }"
      >
        <div class="flexrow form-group">
          <Editor
            :initial-content="motivation || ''"
            fixed-height="8"
            :current-entity-uuid="currentFront?.uuid"
            @related-entries-changed="onRelatedEntriesChanged"
            @editor-saved="onMotivationEditorSaved"
          />
        </div>
      </Panel>
      
      <!-- Grim Portents -->
      <Panel
        :header="localize('labels.front.grimPortents')"
        toggleable
        :pt="{
          root: {
            style: {'margin-top': '0.5em' },
          },
        }"
      >
        <div class="flexcol form-group">
          <DangerGrimPortentTable
            @related-entries-changed="(added, removed) => onRelatedEntriesChanged(added, removed)"
          />
        </div>
      </Panel>
    </div>
  </div>

  <!-- Related Items Management Dialog -->
  <RelatedEntriesManagementDialog
    v-model="showRelatedEntriesDialog"
    :description="localize('dialogs.relatedEntriesManagement.dangerDescription')"
    :added-ids="pendingAddedUUIDs"
    :removed-ids="pendingRemovedUUIDs"
    @update="onRelatedEntriesDialogUpdate"
  />

</template>

<script setup lang="ts">
  // library imports
  import { ref, watch, onMounted, onBeforeUnmount, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, useFrontStore, } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { localize } from '@/utils/game';
  import { notifyWarn } from '@/utils/notifications';
  import { getDangerRelatedEntries } from '@/utils/uuidExtraction';
  import { filterRelatedEntries } from '@/utils/relatedContent';

  // library components
  import TextArea from 'primevue/textarea';
  import InputText from 'primevue/inputtext';
  import Panel from 'primevue/panel';

  // local components
  import Editor from '@/components/Editor.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import DangerParticipantTable from './DangerParticipantTable.vue';
  import DangerGrimPortentTable from './DangerGrimPortentTable.vue';
  import RelatedEntriesManagementDialog from '@/components/RelatedEntriesManagementDialog.vue';

  // types
  import { Danger, Topics, } from '@/types';
  import { Entry } from '@/classes';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits
  
  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const frontStore = useFrontStore();
  const { currentSetting, currentFront } = useContentState();
  const { currentDangerIndex, currentDanger } = storeToRefs(frontStore);
  
  ////////////////////////////////
  // data
  const name = ref('');
  const impendingDoom = ref('');
  const motivation = ref('');
  const showRelatedEntriesDialog = ref<boolean>(false);
  const pendingAddedUUIDs = ref<string[]>([]);
  const pendingRemovedUUIDs = ref<string[]>([]);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  // debounce changes to name
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;
  let impendingDoomTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';

      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('notifications.nameRequired'));
        name.value = currentDanger.value?.name || localize('placeholders.dangerName');
        return;
      }

      if (currentFront.value && currentDanger.value && currentDangerIndex.value !== null && currentDanger.value.name!==newValue) {
        currentDanger.value.name = newValue;
        currentFront.value.updateDanger(currentDangerIndex.value, currentDanger.value);
        await currentFront.value.save();
      }
    }, debounceTime);
  };

  const onImpendingDoomUpdate = (newDoom: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(impendingDoomTimer);
    
    impendingDoomTimer = setTimeout(async () => {
      const newValue = newDoom || '';

      if (currentFront.value && currentDanger.value && currentDangerIndex.value !== null && currentDanger.value.impendingDoom!==newValue) {
        currentDanger.value.impendingDoom = newValue;
        currentFront.value.updateDanger(currentDangerIndex.value, currentDanger.value);
        await currentFront.value.save();
      }
    }, debounceTime);
  };

  const onRelatedEntriesChanged = async (addedUUIDs: string[], removedUUIDs: string[]) => {
    if (!currentDanger.value || !currentSetting.value) {
      return;
    }

    // get the entries we actually need to check
    const { added, removed } = await getDangerRelatedEntries(addedUUIDs, removedUUIDs, currentDanger.value);

    // locations and characters can be linked
    await filterRelatedEntries(currentSetting.value, added, removed, [Topics.Character, Topics.Organization]);

    // Store the pending changes and show dialog if there are any changes
    if (added.length > 0 || removed.length > 0) {
      pendingAddedUUIDs.value = added;
      pendingRemovedUUIDs.value = removed;
      showRelatedEntriesDialog.value = true;
    }
  };

  const onRelatedEntriesDialogUpdate = async (addedEntries: Entry[], removedEntries: Entry[]) => {
    if (!currentDanger.value || !currentFront.value || currentDangerIndex.value == null) 
      return;

    if (addedEntries.length === 0 && removedEntries.length === 0) 
      return;

    // can only be NPC and organization and both go in participants
    // Handle added relationships
    const danger = currentDanger.value;

    for (const entry of addedEntries) {
      danger.participants.push({ uuid: entry.uuid, role: '' });
    }

    // Handle removed relationships
    danger.participants = danger.participants.filter(p => !removedEntries.some(e => e.uuid === p.uuid));

    currentFront.value.updateDanger(currentDangerIndex.value, danger);
    await currentFront.value.save();

    await mainStore.refreshFront();
  };

  const onMotivationEditorSaved = (newMotivation: string) => {
    if (!currentDanger.value) return;
    
    currentDanger.value.motivation = newMotivation;
    saveDanger();
  };

  const onDescriptionEditorSaved = (newContent: string) => {
    if (!currentDanger.value) return;
    
    currentDanger.value.description = newContent;
    saveDanger();
  };
  
  const saveDanger = async () => {
    if (!currentFront.value || !currentDanger.value || currentDangerIndex.value == null) 
      return;
    
    // Update the danger in the front
    const updatedDangers = [...currentFront.value.dangers];
    updatedDangers[currentDangerIndex.value] = currentDanger.value;
    
    // Save the front with the updated danger
    currentFront.value.dangers = updatedDangers;
    await currentFront.value.save();
  };

  const refreshDanger = () => {
    if (currentDanger.value) {
      name.value = currentDanger.value.name || localize('placeholders.dangerName');
      impendingDoom.value = currentDanger.value.impendingDoom || '';
      motivation.value = currentDanger.value.motivation || '';
    }
  };

  ////////////////////////////////
  // watchers
  watch(currentDanger, async (newDanger: Danger | null): Promise<void> => {
    if (newDanger) {
      refreshDanger();
    }
  }, { immediate: true });
  

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    if (currentDanger.value) {
      refreshDanger();
    }
  });

  // cleanup timers on unmount
  onBeforeUnmount(() => {
    clearTimeout(nameDebounceTimer);
  });
  

</script>

<style lang="scss">

</style>