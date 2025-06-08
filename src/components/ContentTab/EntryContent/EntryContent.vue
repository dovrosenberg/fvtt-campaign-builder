<template>
  <form>
    <div ref="contentRef" class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
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
        <button
          v-if="topic===Topics.Character || topic===Topics.Location"
          class="fcb-push-to-session-button"
          @click="onPushToSessionClick"
          :disabled="pushButtonDisabled"
          :title="pushButtonTitle"
        >
          <i class="fas fa-share"></i>
        </button>
        <button
          v-if="canGenerate"
          class="fcb-generate-button"
          @click="onGenerateButtonClick"
          :disabled="generateDisabled"
          :title="`${localize('tooltips.generateContent')}${generateDisabled ? ` - ${localize('tooltips.backendNotAvailable')}` : ''}`"
        >
          <i class="fas fa-head-side-virus"></i>
        </button>
      </header>
      <div class="flexrow tags-container">
        <Tags
          v-if="currentEntry"
          v-model="currentEntry.tags"
          :tag-setting="SettingKey.entryTags"
          @tag-added="onTagChange"
          @tag-removed="onTagChange"
        />
      </div>
      <nav class="fcb-sheet-navigation flexrow tabs" data-group="primary">
        <a class="item" data-tab="description">{{ localize('labels.tabs.entry.description') }}</a>
        <a 
          v-for="relationship in relationships"
          :key="relationship.label"
          class="item" 
          :data-tab="relationship.tab"
        >
          {{ localize(relationship.label) }}
        </a>
        <a 
          v-if="topic===Topics.Character"
          class="item" 
          data-tab="actors"
        >
          {{ localize('labels.tabs.entry.actors') }}
        </a>
        <a 
          v-if="topic===Topics.Location"
          class="item" 
          data-tab="scenes"
        >
          {{ localize('labels.tabs.entry.scenes') }}
        </a>
        <a 
          class="item" 
          data-tab="sessions"
        >
          {{ localize('labels.tabs.entry.sessions') }}
        </a>
      </nav>
      <div class="fcb-tab-body flexrow">
        <DescriptionTab 
          :name="currentEntry?.name || 'Entry'"
          :image-url="currentEntry?.img"
          :window-type="WindowTabType.Entry"
          :topic="topic as ValidTopic"
          @image-change="onImageChange"
        >
          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.fields.type"
            />
            <TypeSelect
              :initial-value="currentEntry?.type || ''"
              :topic="topic as ValidTopic"
              @type-selection-made="onTypeSelectionMade"
            />
          </div>

          <!-- show the species for characters -->
          <div 
            v-if="topic===Topics.Character"
            class="flexrow form-group"
          >
            <LabelWithHelp
              label-text="labels.fields.species"
            />
            <SpeciesSelect
              :initial-value="currentEntry?.speciesId || ''"
              :allow-new-items="false"
              @species-selection-made="onSpeciesSelectionMade"
            />
          </div>

          <div 
            v-if="showHierarchy"
            class="flexrow form-group"
          >
            <LabelWithHelp
              label-text="labels.fields.parent"
            />
            <TypeAhead 
              :initial-list="validParents"
              :initial-value="parentId || ''"
              @selection-made="onParentSelectionMade"
            />
          </div>

          <div class="flexrow form-group description">
            <Editor
              :initial-content="currentEntry?.description || ''"
              :current-entity-uuid="currentEntry?.uuid"
              :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
              @editor-saved="onDescriptionEditorSaved"
              @related-entries-changed="onRelatedEntriesChanged"
            />
          </div>
        </DescriptionTab>
        <div class="tab flexcol" data-group="primary" data-tab="characters">
          <div class="tab-inner">
            <RelatedItemTable :topic="Topics.Character" />
          </div>
        </div> 
        <div class="tab flexcol" data-group="primary" data-tab="locations">
          <div class="tab-inner">
            <RelatedItemTable :topic="Topics.Location" />
          </div>
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="organizations">
          <div class="tab-inner">
            <RelatedItemTable :topic="Topics.Organization" />
          </div>
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="scenes">
          <div class="tab-inner">
            <RelatedDocumentTable 
              :document-link-type="DocumentLinkType.Scenes"
            />
          </div>
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="actors">
          <div class="tab-inner">
            <RelatedDocumentTable 
              :document-link-type="DocumentLinkType.Actors"
            />
          </div>
        </div>
        <div class="tab flexcol" data-group="primary" data-tab="sessions">
          <SessionsTab />
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
  import { computed, nextTick, onMounted, ref, watch, reactive } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTopicIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useSettingDirectoryStore, useMainStore, useNavigationStore, useRelationshipStore, usePlayingStore, } from '@/applications/stores';
  import { hasHierarchy, validParentItems, } from '@/utils/hierarchy';
  import { generateImage } from '@/utils/generation';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { notifyInfo } from '@/utils/notifications';  

  // library components
  import InputText from 'primevue/inputtext';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue';
  import RelatedItemTable from '@/components/Tables/RelatedItemTable.vue';
  import RelatedDocumentTable from '@/components/Tables/RelatedDocumentTable.vue';
  import { updateEntryDialog } from '@/dialogs/createEntry';

  import Editor from '@/components/Editor.vue';
  import TypeAhead from '@/components/TypeAhead.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import Tags from '@/components/Tags.vue';
  import SessionsTab from '@/components/ContentTab/EntryContent/SessionsTab.vue';
  import RelatedEntriesManagementDialog from '@/components/RelatedEntriesManagementDialog.vue';
  import { getRelatedEntries } from '@/utils/uuidExtraction';

  // types
  import { DocumentLinkType, Topics, ValidTopic, WindowTabType } from '@/types';
  import { Setting, TopicFolder, Backend, Entry } from '@/classes';


  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  const navigationStore = useNavigationStore();
  const relationshipStore = useRelationshipStore();
  const playingStore = usePlayingStore();
  const { currentEntry, currentSetting, currentContentTab, refreshCurrentEntry, } = storeToRefs(mainStore);
  const { currentPlayedCampaign } = storeToRefs(playingStore);

  ////////////////////////////////
  // data
  const topicData = {
    [Topics.Character]: { namePlaceholder: 'placeholders.characterName', },
    [Topics.Location]: { namePlaceholder: 'placeholders.characterName', },
    [Topics.Organization]: { namePlaceholder: 'placeholders.characterName', },
  };

  const relationships = [
    { tab: 'characters', label: 'labels.tabs.entry.characters', },
    { tab: 'locations', label: 'labels.tabs.entry.locations',},
    { tab: 'organizations', label: 'labels.tabs.entry.organizations', },
  ] as { tab: string; label: string }[];

  const tabs = ref<foundry.applications.ux.Tabs>();
  const topic = ref<Topics | null>(null);
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const parentId = ref<string | null>(null);
  const validParents = ref<{id: string; label: string}[]>([]);
  const isGeneratingImage = reactive<Record<string, boolean>>({}); // Flag to track whether image generation is in progress - only one per id at a time
  const pushButtonTitle = ref<string>('');
  const pushButtonDisabled = ref<boolean>(false);
  const showRelatedEntriesDialog = ref<boolean>(false);
  const pendingAddedUUIDs = ref<string[]>([]);
  const pendingRemovedUUIDs = ref<string[]>([]);

  ////////////////////////////////
  // computed data
    
  const icon = computed((): string => (!topic.value ? '' : getTopicIcon(topic.value)));
  const namePlaceholder = computed((): string => (topic.value===null ? '' : (localize(topicData[topic.value]?.namePlaceholder || '') || '')));
  const canGenerate = computed(() => topic.value && [Topics.Character, Topics.Location, Topics.Organization].includes(topic.value));
  const generateDisabled = computed(() => !Backend.available);
  const showHierarchy = computed((): boolean => (topic.value===null ? false : hasHierarchy(topic.value)));

  ////////////////////////////////
  // methods
  const refreshEntry = async () => {
    // refresh this so we can capture changes to campaigns as soon as they happen
    updatePushButton();

    if (!currentEntry.value || !currentEntry.value.uuid) {
      topic.value = null;
    } else {
      let newTopicFolder: TopicFolder | null;

      newTopicFolder = currentEntry.value.topicFolder;
      if (!newTopicFolder) 
        throw new Error('Invalid entry topic in EntryContent.watch-currentEntry');

      // we're going to show a content page
      topic.value = newTopicFolder.topic;

      // load starting data values
      name.value = currentEntry.value.name || '';

      // set the parent and valid parents
      if (currentSetting.value) {    
        parentId.value = await currentEntry.value.getParentId();

        validParents.value = validParentItems(currentSetting.value as Setting, currentEntry.value).map((e)=> ({
          id: e.id,
          label: e.name || '',
        }));
      }
    }
  };

    /** how many campaigns have available sessions */
    const numAvailableSessions = (): number => {
    if (!currentSetting.value)
      return 0;

    let num = 0;
    // otherwise check all campaigns until we find one with sessions that don't have it
    for (const campaignId of Object.keys(currentSetting.value?.campaigns || {})) {
      if (currentSetting.value?.campaigns[campaignId].currentSession && !currentSetting.value.campaigns[campaignId].currentSession.npcs.find((npc) => npc.uuid===currentEntry.value?.uuid)) {
        num++;
      }
    }

    return num;
  };

  // this is a bit odd, but using computed functions doesn't work because they don't update when campaigns are added, etc. and it seemed like a lot of overhead to capture changes there just for this title
  const updatePushButton = (): void => {
    const numSessions = numAvailableSessions();
    
    if (numSessions===0) {
      pushButtonTitle.value = localize('tooltips.sessionUnavailable');
      pushButtonDisabled.value = true;
    } else {
      // note that we're counting sessions without this entry, so there may be some others that do have it
      pushButtonTitle.value = localize('tooltips.addToASession')
      pushButtonDisabled.value = false;
    }
  }

  ////////////////////////////////
  // event handlers

  // debounce changes to name
  let debounceTimer: NodeJS.Timeout | undefined = undefined;

  const onNameUpdate = (newName: string | undefined) => {
    const debounceTime = 500;

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(async () => {
      const newValue = newName || '';
      if (currentEntry.value && currentEntry.value.name!==newValue) {
        currentEntry.value.name = newValue;
        await currentEntry.value.save();

        await settingDirectoryStore.refreshSettingDirectoryTree([currentEntry.value.uuid]);
        await navigationStore.propagateNameChange(currentEntry.value.uuid, newValue);
        await relationshipStore.propagateFieldChange(currentEntry.value, 'name');
      }
    }, debounceTime);
  };

  const onPushToSessionClick = async (event: MouseEvent) : Promise<void> => {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    if (!currentSetting.value)
      return;

    // find all the campaigns with an active session
    let campaignsWithSessions = [] as { uuid: string; name: string}[];

    for (const campaignId of Object.keys(currentSetting.value.campaigns)) {
      if (currentSetting.value?.campaigns[campaignId].currentSession && !currentSetting.value.campaigns[campaignId].currentSession.npcs.find((npc) => npc.uuid===currentEntry.value?.uuid)) {
        campaignsWithSessions.push({ uuid: campaignId, name: currentSetting.value.campaigns[campaignId].name });
      }
    }

    // if there aren't any, we're done (though this should never happen because the button shouldn't be enabled)
    if (campaignsWithSessions.length===0) {
      return;
    }

    // if there's more than one, we need the menu
    const campaigns = currentSetting.value.campaigns;

    type MenuItem = {
      label: string;
      onClick: () => void | Promise<void>;
      customClass?: string;
      divided?: 'down' | undefined;
    };

    let menuItems = [] as MenuItem[];

    // if we're in play mode with an active session, put that at the top
    let currentCampaignId: string | null = null;
    let activeItem: MenuItem | null = null;
    if (currentPlayedCampaign.value?.currentSession) {
      currentCampaignId = currentPlayedCampaign.value.uuid;
      
      activeItem = {
        label: `${campaigns[currentCampaignId].name} (#${campaigns[currentCampaignId].currentSession?.number})`,        
        customClass: 'push-to-active-campaign-menu-item',
        onClick: async () => { await selectCampaignForPush(currentCampaignId as string); },
        divided: campaignsWithSessions.length > 1 ? 'down' : undefined,
      };
    }

    // check for any other campaigns
    for (const campaignId of Object.keys(campaigns)) {
      // skip the one we added above
      if (campaignId === currentCampaignId)
        continue;

      // skip ones without sessions
      if (!campaigns[campaignId].currentSession)
        continue;

      menuItems.push({
        label: `${campaigns[campaignId].name} (#${campaigns[campaignId].currentSession?.number})`,        
        onClick: async () => { await selectCampaignForPush(campaignId); },
      });
    }

    menuItems = menuItems.sort((a,b) => a.label.localeCompare(b.label));
    if (activeItem)
      menuItems = [activeItem, ...menuItems];

    
    // for now, we're showing here even if there's only one just to make totally clear where it's going to end up
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: menuItems,
    });
  }

  const selectCampaignForPush = async (campaignUuid: string): Promise<void> => {
    // get the campaign
    const campaign = await currentSetting.value?.campaigns[campaignUuid];
    if (!campaign)
      return;

    // get the session
    const session = campaign.currentSession;
    if (!session || !currentEntry.value)
      return;

    if (topic.value===Topics.Character) {
      // add to NPC list
      await session.addNPC(currentEntry.value.uuid);

      // no refresh needed since we know we're not on the session tab
    } else if (topic.value===Topics.Location) {
      // add to location list
      await session.addLocation(currentEntry.value.uuid);
    } else {
      return;
    }

    notifyInfo(`${currentEntry.value.name} ${localize('notifications.addedToSession')}`);
    updatePushButton();// # of available changed
  };

  const onGenerateButtonClick = (event: MouseEvent): void => {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    if (topic.value != null && ![Topics.Character, Topics.Location, Topics.Organization].includes(topic.value)) {
      return;
    }

    // Show context menu
    const menuItems = [
      {
        icon: 'fa-file-lines',
        iconFontClass: 'fas',
        label: localize('contextMenus.generate.description'),        
        onClick: async () => {
          if (currentEntry.value)
            await updateEntryDialog(currentEntry.value);
        }
      },
      {
        icon: 'fa-image',
        iconFontClass: 'fas',
        label: `${localize('contextMenus.generate.image')} ${isGeneratingImage[currentEntry.value?.uuid as string] ? ` - ${localize('contextMenus.generate.inProgress')}` : ''}`,
        disabled: isGeneratingImage[currentEntry.value?.uuid as string],
        onClick: async () => {
          if (!isGeneratingImage[currentEntry.value?.uuid as string] && currentSetting.value && currentEntry.value) {
            // save entry because it could change before generation is done
            const entryGenerated = currentEntry.value.uuid;

            isGeneratingImage[entryGenerated] = true;

            await generateImage(currentSetting.value, currentEntry.value);

            if (entryGenerated===currentEntry.value.uuid)
              mainStore.refreshEntry();

            isGeneratingImage[entryGenerated] = false;
          }
        }
      },
    ];

    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: menuItems,
    });
  };

  
  const onImageChange = async (imageUrl: string) => {
    if (currentEntry.value) {
      currentEntry.value.img = imageUrl;
      await currentEntry.value.save();
    }
  }

  // we can use this for add and remove because the change was already passed back to 
  //    currentEntry - we just need to save
  const onTagChange = async (): Promise<void> => {
    if (!currentEntry.value)
      return;
    await currentEntry.value.save();
  }

  const onTypeSelectionMade = async (selection: string) => {
    if (currentEntry.value) {
      const oldType = currentEntry.value.type;
      currentEntry.value.type = selection;
      await currentEntry.value.save();

      // Update the type in the directory tree
      await settingDirectoryStore.updateEntryType(currentEntry.value, oldType);

      // Propagate the type change to all related entries
      await relationshipStore.propagateFieldChange(currentEntry.value, 'type');
    }
  };

  const onParentSelectionMade = async (selection: string): Promise<void> => {
    if (!currentEntry.value?.topic || !currentEntry.value?.uuid)
      return;

    if (!currentEntry.value.topicFolder)
      throw new Error('Invalid topic in EntryContent.onParentSelectionMade()');

    await settingDirectoryStore.setNodeParent(currentEntry.value.topicFolder, currentEntry.value.uuid, selection || null);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentEntry.value)
      return;

    currentEntry.value.description = newContent;
    await currentEntry.value.save();
  };

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

  const onSpeciesSelectionMade = async (species: {id: string; label: string}): Promise<void> => {
    if (!currentEntry.value?.topic || !currentEntry.value?.uuid)
      return;

    currentEntry.value.speciesId = species.id;
    await currentEntry.value.save();
  };

  ////////////////////////////////
  // watchers
  // in case the tab is changed externally
  watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
    if (newTab !== oldTab && tabs.value) {
      tabs.value.activate(newTab || 'description');    
    }
  });

  // see if we want to force a full refresh (ex. when parent changes externally)
  watch(refreshCurrentEntry, async (newValue: boolean): Promise<void> => {
    if (newValue) {
      await refreshEntry();
      refreshCurrentEntry.value = false;
    }
  });
  
  watch(currentEntry, async (): Promise<void> => {
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
    tabs.value = new foundry.applications.ux.Tabs({ navSelector: '.tabs', contentSelector: '.fcb-tab-body', initial: 'description', /*callback: null*/ });

    // update the store when tab changes
    tabs.value.callback = () => {
      currentContentTab.value = tabs.value?.active || null;
    };

    // have to wait until they render
    await nextTick();
    if (contentRef.value) 
      tabs.value.bind(contentRef.value);
  });


</script>

<style lang="scss" scoped>
  .fcb-generate-button, .fcb-push-to-session-button {
    &:hover:disabled {
      // prevent button from looking like you can click it if you can't
      background: unset;
    }
  }

  .push-to-active-campaign-menu-item {
    font-weight: bold;
  }
  
  .tags-container {
    min-height: 43px; /* Set a fixed minimum height for the tags container */
    position: relative;
  }
</style>