<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol" style="overflow-y: auto">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${getTopicIcon(Topics.PC)} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name" 
          unstyled
          :disabled="true"
          class="fcb-input-name"
          :pt="{
            root: { class: 'full-height' } 
          }" 
        />
      </header>
      <ContentTabStrip 
        :tabs="tabs" 
        default-tab="description"
      >
        <div 
          class="tab flexcol" 
          data-group="primary" 
          data-tab="description" 
          style="height:100%"
        >
          <div class="tab-inner">
            <div class="fcb-description-wrapper flexrow">
              <div 
                class="fcb-sheet-image"
                @drop="onDropActor"
                @dragover="DragDropService.standardDragover"
                @click="onActorImageClick"
                @contextmenu.prevent="onImageContextMenu"
              >
                <div v-if="isPC && actorId">
                  <img 
                    class="profile"
                    :src="currentImage"
                  >
                </div>
                <div v-else>
                  Drag an actor here to link it.
                </div>
              </div>
              <div class="fcb-description-content flexcol" style="height: unset">
                <div class="flexrow form-group">
                  <LabelWithHelp
                    label-text="labels.fields.playerName"
                  />
                  <InputText
                    v-model="playerName"
                    for="fcb-input-name" 
                    class="fcb-input-name"
                    unstyled
                    @update:model-value="onPlayerNameUpdate"
                    :pt="{
                      root: { class: 'full-height' } 
                    }" 
                  />
                </div>

                <CustomFieldsBlocks
                  v-if="currentEntry"
                  :content-type="CustomFieldContentType.PC"
                  @related-entries-changed="onRelatedEntriesChanged"
                />

              </div>
            </div>
          </div>
        </div>
        <JournalTab
          v-if="currentEntry && tabVisibility[TabVisibilityItem.EntryPCJournals]"
          :initial-journals="currentEntry.journals"
          @journals-updated="onJournalsUpdate"
        />
        <div 
          v-for="relationship in relationships"
          :key="relationship.tab"
          class="tab flexcol" 
          data-group="primary" 
          :data-tab="relationship.tab"
        >
          <div class="tab-inner">
            <RelatedEntryTable :topic="relationship.topic" />
          </div>
        </div>
        <div 
          v-if="tabVisibility[TabVisibilityItem.EntryPCFoundry]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="foundry"
        >
          <div class="tab-inner">
            <RelatedDocumentTable 
              :document-link-type="DocumentLinkType.GenericFoundry"
            />
          </div>
        </div>
      </ContentTabStrip>
    </div>

    <!-- Related Items Management Dialog -->
    <RelatedEntriesManagementDialog
      v-model="showRelatedEntriesDialog"
      :description="localize('dialogs.relatedEntriesManagement.pcDescription')"
      :added-ids="pendingAddedUUIDs"
      :removed-ids="pendingRemovedUUIDs"
      @update="onRelatedEntriesDialogUpdate"
    />
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { ref, watch, onMounted, computed, toRaw, onBeforeUnmount } from 'vue';

  // local imports
  import { useMainStore, useNavigationStore, useSettingDirectoryStore, useRelationshipStore } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { getTopicIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import DragDropService from '@/utils/dragDrop'; 
  import { getEntryRelatedEntries } from '@/utils/uuidExtraction';
  import { ModuleSettings, SettingKey } from '@/settings';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import JournalTab from '@/components/ContentTab/JournalTab.vue';
  import RelatedDocumentTable from '@/components/tables/RelatedDocumentTable.vue'; 
  import RelatedEntryTable from '@/components/tables/RelatedEntryTable.vue';
  import RelatedEntriesManagementDialog from '@/components/dialogs/RelatedEntriesManagementDialog.vue';
  import CustomFieldsBlocks from '@/components/CustomFieldsBlocks.vue';
  import ContentTabStrip from '@/components/ContentTab/ContentTabStrip.vue';

  // types
  import { Entry } from '@/classes';
  import { FoundryDragType, Topics, RelatedJournal, ValidTopic, CustomFieldContentType, TabVisibilityItem, ContentTabDescriptor, DocumentLinkType } from '@/types';
  import { DOCUMENT_TYPES } from '@/documents';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  const relationshipStore = useRelationshipStore();
  const { currentEntry, currentContentTab } = useContentState();
  
  ////////////////////////////////
  // data
  const playerName = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);

  const relationships = [
    { tab: 'characters', label: 'labels.tabs.entry.characters', topic: Topics.Character, visibilityKey: TabVisibilityItem.EntryPCCharacters },
    { tab: 'locations', label: 'labels.tabs.entry.locations', topic: Topics.Location, visibilityKey: TabVisibilityItem.EntryPCLocations },
    { tab: 'organizations', label: 'labels.tabs.entry.organizations', topic: Topics.Organization, visibilityKey: TabVisibilityItem.EntryPCOrganizations },
  ] as { tab: string; label: string; topic: ValidTopic; visibilityKey: TabVisibilityItem }[];

  const showRelatedEntriesDialog = ref<boolean>(false);
  const pendingAddedUUIDs = ref<string[]>([]);
  const pendingRemovedUUIDs = ref<string[]>([]);

  ////////////////////////////////
  // computed data
  const tabVisibility = computed(() => {
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tabVisibilitySettings);
  });

  const name = computed(() => (currentEntry.value?.name || ''));
  const isPC = computed(() => currentEntry.value?.topic === Topics.PC);
  const actorId = computed(() => (isPC.value ? (currentEntry.value?.actorId || '') : ''));
  const currentImage = computed(() => (isPC.value ? (currentEntry.value?.actor?.img || '') : ''));

  const tabs = computed(() => {
    const baseTabs = [
      { id: 'description', label: localize('labels.description') },
    ] as ContentTabDescriptor[];

    // Journals tab
    if (tabVisibility.value[TabVisibilityItem.EntryPCJournals]) {
      baseTabs.push({ id: 'journals', label: localize('labels.journals') });
    }

    // Relationship tabs (characters, locations, organizations)
    for (const relationship of relationships) {
      if (tabVisibility.value[relationship.visibilityKey]) {
        baseTabs.push({ id: relationship.tab, label: localize(relationship.label) });
      }
    }

    // Foundry tab
    if (tabVisibility.value[TabVisibilityItem.EntryPCFoundry]) {
      baseTabs.push({ id: 'foundry', label: localize('labels.tabs.entry.foundry') });
    }

    return baseTabs;
  });

  ////////////////////////////////
  // methods
  const refreshEntry = async () => {
    if (!currentEntry.value || currentEntry.value.topic!==Topics.PC)
      return;
    
    // load starting data values
    playerName.value = currentEntry.value.playerName || '';
    await currentEntry.value.getActor();
  };

  ////////////////////////////////
  // event handlers
  const onDropActor = async (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentEntry.value || currentEntry.value.topic !== Topics.PC)
      return;

    // parse the data - we're just looking for raw Foundry data here
    let data = DragDropService.getValidatedData(event) as FoundryDragType;
    if (!data)
      return;

    if (data.type==='Actor' && data.uuid) {
      const actor = await foundry.utils.fromUuid<Actor>(data.uuid);
      if (!actor)
        return;
      
      currentEntry.value.actorId = data.uuid;
      currentEntry.value.name = actor.name;
      await currentEntry.value.save();
      await mainStore.refreshEntry();

      // need to refreshEntry first to ensure that the new actor gets loaded so we can call name
      await navigationStore.propagateNameChange(currentEntry.value.uuid, currentEntry.value.name);
      await settingDirectoryStore.refreshSettingDirectoryTree([currentEntry.value.uuid]);
      await relationshipStore.propagateFieldChange(currentEntry.value, 'name');
    }
  }

  const onImageContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }

  // debounce changes to name
  let nameDebounceTimer: NodeJS.Timeout | undefined = undefined;
  
  const onPlayerNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;
  
    clearTimeout(nameDebounceTimer);
    
    nameDebounceTimer = setTimeout(async () => {
      const newValue = newName || '';
      if (currentEntry.value && currentEntry.value.playerName!==newValue) {
        currentEntry.value.playerName = newValue;
        await currentEntry.value.save();
      }
    }, debounceTime);
  };

  // referenced entries changed in an editor
  const onRelatedEntriesChanged = async (addedUUIDs: string[], removedUUIDs: string[]) => {
    if (!currentEntry.value) {
      return;
    }

    // check against current relationships
    const { added, removed } = await getEntryRelatedEntries(addedUUIDs, removedUUIDs, currentEntry.value);

    let invalidOnes: string[] = [];

    // we can only link to things in the current setting's compendium; filter others out quickly
    for (const uuid of added.concat(removed)) {
      if (!uuid.startsWith(`Compendium.${currentEntry.value.compendiumId}`))
        invalidOnes.push(uuid);
    }

    // remove those
    let finalAdded = added.filter(uuid => !invalidOnes.includes(uuid));
    let finalRemoved = removed.filter(uuid => !invalidOnes.includes(uuid));

    // from what's left filter out settings, campaigns, and sessions
    // we know the uuids are journalentries, so the id is the last 16
    const ids = added.concat(removed).map(uuid => uuid.slice(-16));
    const possibleConnections = await currentEntry.value.compendium.getDocuments({ _id__in: ids });

    invalidOnes = [];
    for (const doc of possibleConnections) {
      // get the type - we only care about entries
      if (!doc.pages?.contents ||doc.pages.contents[0].type!==DOCUMENT_TYPES.Entry) {
        invalidOnes.push(doc.uuid);
      } else {
        const entry = new Entry(doc);

        // pcs don't link to other pcs
        if (entry.topic===Topics.PC)
          invalidOnes.push(doc.uuid);
      }
    }
  
    finalAdded = finalAdded.filter(uuid => !invalidOnes.includes(uuid));
    finalRemoved = finalRemoved.filter(uuid => !invalidOnes.includes(uuid));

    // Store the pending changes and show dialog if there are any changes
    if (finalAdded.length > 0 || finalRemoved.length > 0) {
      pendingAddedUUIDs.value = finalAdded;
      pendingRemovedUUIDs.value = finalRemoved;
      showRelatedEntriesDialog.value = true;
    }
  };

  const onActorImageClick = async () => {
    if (!currentEntry.value || currentEntry.value.topic !== Topics.PC)
      return;

    const actor = await currentEntry.value?.getActor();
    if (actor)
      await toRaw(actor)?.sheet?.render(true);
  }

  const onRelatedEntriesDialogUpdate = async (addedEntries: Entry[], removedEntries: Entry[]) => {
    if (!currentEntry.value) 
      return;

    // Handle added relationships
    for (const entry of addedEntries) {
      await relationshipStore.addRelationship(entry, {});
    }

    // Handle removed relationships
    for (const entry of removedEntries) {
      await relationshipStore.deleteRelationship(entry.uuid);
    }
  };

  const onJournalsUpdate = async (newJournals: RelatedJournal[]) => {
    if (currentEntry.value) {
      currentEntry.value.journals = newJournals;
      await currentEntry.value.save();
    }
  };

  ////////////////////////////////
  // watchers
  watch(currentEntry, async (newEntry: Entry | null): Promise<void> => {
    if (!newEntry) {
      return;
    }
    
    await refreshEntry();

    if (!currentContentTab.value) {
      currentContentTab.value = 'description';
    }
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    if (currentEntry.value && currentEntry.value.topic===Topics.PC) {
      // load starting data values
      playerName.value = currentEntry.value.playerName || '';

      await currentEntry.value.getActor();
    }
  });

  // Clear debounce timer on unmount
  onBeforeUnmount(() => {
    if (nameDebounceTimer) {
      clearTimeout(nameDebounceTimer);
      nameDebounceTimer = undefined;
    }
  });

</script>

<style lang="scss">
</style>