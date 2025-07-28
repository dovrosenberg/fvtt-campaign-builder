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
      <div class="fcb-sheet-subtab-container flexrow">
        <div class="fcb-subtab-wrapper">
          <nav class="fcb-sheet-navigation flexrow tabs" data-group="primary">
            <a class="item" data-tab="description">{{ localize('labels.tabs.entry.description') }}</a>
            <a class="item" data-tab="journals">{{ localize('labels.tabs.entry.journals') }}</a>
            <a 
              v-for="relationship in relationships"
              :key="relationship.tab"
              class="item" 
              :data-tab="relationship.tab"
            >
              {{ localize(relationship.label) }}
            </a>
          </nav>
          <div class="fcb-tab-body flexrow">
            <div class="tab flexcol" data-group="primary" data-tab="description" style="height:100%">
              <div class="tab-inner">
                <div class="fcb-description-wrapper flexrow">
                  <div 
                    class="fcb-sheet-image"
                    @drop="onDropActor"
                    @dragover="onDragoverActor"
                    @click="onActorImageClick"
                    @contextmenu.prevent="onImageContextMenu"
                  >
                    <div v-if="currentEntry?.actorId">
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
                    <div class="flexrow form-group">
                      <LabelWithHelp
                        label-text="labels.fields.backgroundPoints"
                      />
                    </div>
                    <div class="flexrow form-group">
                      <Editor 
                        :initial-content="currentEntry?.background || ''"
                        fixed-height="240px"
                        @editor-saved="onBackgroundSaved"
                      />
                    </div>
                    <div class="flexrow form-group">
                      <LabelWithHelp
                        label-text="labels.fields.otherPlotPoints"
                      />
                    </div>
                    <div class="flexrow form-group">
                      <Editor 
                        :initial-content="currentEntry?.plotPoints || ''"
                        fixed-height="240px"
                        @editor-saved="onPlotPointsSaved"
                      />
                    </div>
                    <div class="flexrow form-group">
                      <LabelWithHelp
                        label-text="labels.fields.desiredMagicItems"
                      />
                    </div>
                    <div class="flexrow form-group">
                      <Editor 
                        :initial-content="currentEntry?.magicItems || ''"
                        fixed-height="240px"
                        @editor-saved="onMagicItemsSaved"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <JournalTab
              v-if="currentEntry"
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
                <RelatedItemTable :topic="relationship.topic" />
              </div>
            </div> 
          </div>
        </div>
      </div>
    </div>

    <!-- Related Items Management Dialog -->
    <RelatedEntriesManagementDialog
      v-model="showRelatedEntriesDialog"
      :added-ids="pendingAddedUUIDs"
      :removed-ids="pendingRemovedUUIDs"
      @update="onRelatedEntriesDialogUpdate"
    />
  </form>	 
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';
  import { ref, watch, onMounted, computed, toRaw, nextTick } from 'vue';

  // local imports
  import { useMainStore, useNavigationStore, useSettingDirectoryStore, useRelationshipStore } from '@/applications/stores';
  import { WindowTabType } from '@/types';
  import { getTopicIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { getValidatedData } from '@/utils/dragdrop';
  
  // library components
  import InputText from 'primevue/inputtext';

  // local components
  import Editor from '@/components/Editor.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import JournalTab from '@/components/ContentTab/JournalTab.vue';
  import RelatedItemTable from '@/components/tables/RelatedItemTable.vue';
  import RelatedEntriesManagementDialog from '@/components/RelatedEntriesManagementDialog.vue';
  
  // types
  import { Topics } from '@/types';

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
  const { currentEntry, currentContentTab } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  const playerName = ref<string>('');
  const tabs = ref<foundry.applications.ux.Tabs>();

  const contentRef = ref<HTMLElement | null>(null);

  const relationships = [
    { tab: 'characters', label: 'labels.tabs.entry.characters', topic: Topics.Character },
    { tab: 'locations', label: 'labels.tabs.entry.locations', topic: Topics.Location },
    { tab: 'organizations', label: 'labels.tabs.entry.organizations', topic: Topics.Organization },
  ] as { tab: string; label: string; topic: Topics }[];

  const showRelatedEntriesDialog = ref<boolean>(false);
  const pendingAddedUUIDs = ref<string[]>([]);
  const pendingRemovedUUIDs = ref<string[]>([]);

  ////////////////////////////////
  // computed data
  const name = computed(() => (currentEntry.value?.name || ''));
  const currentImage = computed(() => (currentEntry.value?.actor?.img || ''));

  ////////////////////////////////
  // methods
  const refreshEntry = async () => {
    // load starting data values
    name.value = currentEntry.value.name || '';
    playerName.value = currentEntry.value.playerName || '';
    await currentEntry.value.getActor();
  };
  

  ////////////////////////////////
  // event handlers
  const onDragoverActor = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDropActor = async (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentEntry.value)
      return;

    // parse the data
    let data = getValidatedData(event);
    if (!data)
      return;

    if (data.type==='Actor' && data.uuid) {
      const actor = await fromUuid<Actor>(data.uuid);
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

  const onActorImageClick = async () => {
    const actor = await currentEntry.value?.getActor();
    if (actor)
      await toRaw(actor)?.sheet?.render(true);
  }

  const onBackgroundSaved = async (content: string) => {
    if (!currentEntry.value)
      return;

    currentEntry.value.background = content;
    await currentEntry.value.save();
  }

  const onPlotPointsSaved = async (content: string) => {
    if (!currentEntry.value)
      return;

    currentEntry.value.plotPoints = content;
    await currentEntry.value.save();
  }

  const onMagicItemsSaved = async (content: string) => {
    if (!currentEntry.value)
      return;

    currentEntry.value.magicItems = content;
    await currentEntry.value.save();
  }

  const onRelatedEntriesChanged = async (addedUUIDs: string[], removedUUIDs: string[]) => {
    if (!currentEntry.value || !ModuleSettings.get(SettingKey.autoRelationships)) {
      return;
    }

    // check against current relationships
    const { added, removed } = await getRelatedEntries(addedUUIDs, removedUUIDs, currentEntry.value);

    // Store the pending changes and show dialog if there are any changes
    if (added.length > 0 || removed.length > 0) {
      pendingAddedUUIDs.value = added;
      pendingRemovedUUIDs.value = removed;
      showRelatedEntriesDialog.value = true;
    }
  };

  const onRelatedEntriesDialogUpdate = async (addedEntries: Entry[], removedEntries: Entry[]) => {
    if (!currentEntry.value) 
      return;

    // Handle added relationships
    for (const entry of addedEntries) {
      await relationshipStore.addRelationship(entry, {});
    }

    // Handle removed relationships
    for (const entry of removedEntries) {
      await relationshipStore.deleteRelationship(entry.topic, entry.uuid);
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
  watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
    if (newTab!==oldTab) {
      tabs.value?.activate(newTab || 'description');    
    }
  });

  watch(currentEntry, async (newEntry: Entry | null): Promise<void> => {
    if (!newEntry) {
      return;
    }
    
    await refreshEntry();

    if (!currentContentTab.value) {
      currentContentTab.value = 'description';
    }

    if (tabs.value) {
      tabs.value.activate(currentContentTab.value); 
    }
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    // Ensure DOM is fully ready before initializing tabs
    await nextTick();
    
    tabs.value = new foundry.applications.ux.Tabs({ 
      navSelector: '.tabs', 
      contentSelector: '.fcb-tab-body', 
      initial: 'description'
    });

    // update the store when tab changes
    tabs.value.callback = () => {
      currentContentTab.value = tabs.value?.active || null;
    };

    if (contentRef.value) 
      tabs.value.bind(contentRef.value);

    if (currentEntry.value) {
      // load starting data values
      playerName.value = currentEntry.value.playerName || '';

      await currentEntry.value.getActor();
    }
  });

</script>

<style lang="scss">
</style>