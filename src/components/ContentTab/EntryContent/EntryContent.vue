<template>
  <!-- PCs use their own thing because their image works differently -->
  <PCContent v-if="topic===Topics.PC" />
  <form v-else>
    <div class="fcb-sheet-container flexcol">
      <header class="fcb-name-header flexrow">
        <i :class="`fas ${icon} sheet-icon`"></i>
        <InputText
          v-model="name"
          for="fcb-input-name"
          class="fcb-input-name"
          data-testid="entry-name-input"
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
          data-testid="entry-push-to-session-button"
          @click="onPushToSessionClick"
          :disabled="pushButtonDisabled"
          :title="pushButtonTitle"
          style="margin-left: 8px;"
        >
          <i class="fas fa-share"></i>
        </button>
        <button
          v-if="showFoundryDocButton"
          class="fcb-foundry-doc-button"
          data-testid="entry-foundry-doc-button"
          @click="onFoundryDocButtonClick"
          :disabled="foundryDocButtonDisabled"
          :title="foundryDocButtonTitle"
        >
          <i :class="`fas ${foundryDocButtonIcon}`"></i>
        </button>
        <button
          v-if="showVoiceButton"
          class="fcb-voice-button"
          :class="{ 'has-recording': !!currentEntry?.voiceRecordingPath }"
          data-testid="entry-voice-button"
          @click="onVoiceButtonClick"
          :title="voiceButtonTitle"
        >
          <i class="fas fa-microphone"></i>
        </button>
        <button
          v-if="canGenerate"
          class="fcb-generate-button"
          data-testid="entry-generate-button"
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
          :whitelist-supplement="tagsWhitelistSupplement"
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
          :name="currentEntry?.name || 'Entry'"
          :image-url="currentEntry?.img"
          :window-type="WindowTabType.Entry"
          :show-image="ModuleSettings.get(SettingKey.showImages)?.entries ?? true"
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
              :allow-new-items="false"
              @selection-made="onParentSelectionMade"
            />
          </div>

          <div class="flexrow form-group">
            <LabelWithHelp
              label-text="labels.description"
              top-label
            />
          </div>
          <div class="flexrow form-group fcb-description">
            <Editor
              :initial-content="currentEntry?.description || ''"
              :current-entity-uuid="currentEntry?.uuid"
              :fixed-height="descriptionHeight"
              :resizable="true"
              @editor-saved="onDescriptionEditorSaved"
              @related-entries-changed="onRelatedEntriesChanged"
              @editor-resized="onDescriptionEditorResized"
            />
          </div>

          <CustomFieldsBlocks
            v-if="customFieldContentType !== null && currentEntry"
            :content-type="customFieldContentType"
            @related-entries-changed="onRelatedEntriesChanged"
          />

        </DescriptionTab>
        <JournalTab
          v-if="currentEntry && topic && tabVisibility[topicTabMap[topic]['journals']]"
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
            <RelatedEntryTable :topic="relationship.topic as ValidTopic" />
          </div>
        </div>
        <div 
          v-if="topic && topic === Topics.Location && tabVisibility[topicTabMap[topic]['scenes']]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="scenes"
        >
          <div class="tab-inner">
            <RelatedDocumentTable 
              :document-link-type="DocumentLinkType.Scenes"
            />
          </div>
        </div>
        <div 
          v-if="topic && topic === Topics.Character && tabVisibility[topicTabMap[topic]['actors']]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="actors"
        >
          <div class="tab-inner">
            <RelatedDocumentTable 
              :document-link-type="DocumentLinkType.Actors"
            />
          </div>
        </div>
        <div 
          v-if="topic && tabVisibility[topicTabMap[topic]['sessions']]"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="sessions"
        >
          <SessionsTab />
        </div>
        <div 
          v-if="topic && tabVisibility[topicTabMap[topic]['foundry']]"
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
        <div 
          v-if="showTimelineTab"
          class="tab flexcol" 
          data-group="primary" 
          data-tab="timeline"
        >
          <div class="tab-inner">
            <TimelineTab />
          </div>
        </div>
      </ContentTabStrip>
    </div>

    <!-- Related Items Management Dialog -->
    <RelatedEntriesManagementDialog
      v-model="showRelatedEntriesDialog"
      :description="localize('dialogs.relatedEntriesManagement.entryDescription')"
      :added-ids="pendingAddedUUIDs"
      :removed-ids="pendingRemovedUUIDs"
      @update="onRelatedEntriesDialogUpdate"
    />

    <!-- Voice Recording Dialog -->
    <VoiceRecordingDialog
      v-model="showRecordingDialog"
      :recorder="activeRecorder"
      :stream="activeStream"
      :mime-type="activeMimeType"
      @stopped="onRecordingStopped"
      @error="onRecordingError"
      @cancel="onRecordingCancelled"
    />
  </form>
</template>

<script setup lang="ts">

  // library imports
  import { computed, ref, watch, provide, onUnmounted, onBeforeUnmount, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTopicIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useSettingDirectoryStore, useBackendStore, useNavigationStore, useRelationshipStore, usePlayingStore, } from '@/applications/stores';
  import { useContentState } from '@/composables/useContentState';
  import { useEntryDerivedState, ENTRY_DERIVED_STATE_KEY } from '@/composables/useEntryDerivedState';
  import { hasHierarchy, validParentItems, } from '@/utils/hierarchy';
  import { generateImage } from '@/utils/generation';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { notifyInfo, notifyWarn } from '@/utils/notifications';  
  import { updateEntryDialog } from '@/dialogs/createEntry';
  import { getEntryRelatedEntries } from '@/utils/uuidExtraction';
  import { filterRelatedEntries } from '@/utils/relatedContent';
  import { notifyError } from '@/utils/notifications';
  import { FCBDialog } from '@/dialogs';
  import VoiceRecordingService from '@/utils/voiceRecording';
  import { calendariaAvailable, calendarActive } from '@/utils/calendar/calendarState';

  // library components
  import InputText from 'primevue/inputtext';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue';
  import JournalTab from '@/components/ContentTab/JournalTab.vue';
  import PCContent from '@/components/ContentTab/PCContent.vue';
  import RelatedEntryTable from '@/components/tables/RelatedEntryTable.vue';
  import RelatedDocumentTable from '@/components/tables/RelatedDocumentTable.vue';
  import Editor from '@/components/Editor.vue';
  import TypeAhead from '@/components/TypeAhead.vue';
  import SpeciesSelect from '@/components/ContentTab/EntryContent/SpeciesSelect.vue';
  import TypeSelect from '@/components/ContentTab/EntryContent/TypeSelect.vue';
  import LabelWithHelp from '@/components/LabelWithHelp.vue';
  import Tags from '@/components/Tags.vue';
  import SessionsTab from '@/components/ContentTab/EntryContent/SessionsTab.vue';
  import RelatedEntriesManagementDialog from '@/components/dialogs/RelatedEntriesManagementDialog.vue';
  import ContentTabStrip from '@/components/ContentTab/ContentTabStrip.vue';
  import CustomFieldsBlocks from '@/components/CustomFieldsBlocks.vue';
  import VoiceRecordingDialog from '@/components/dialogs/VoiceRecordingDialog.vue';
  import TimelineTab from '@/components/ContentTab/TimelineTab.vue';
  
  // types
  import { CustomFieldContentType, DocumentLinkType, Topics, ValidTopic, WindowTabType, RelatedJournal, ContentTabDescriptor, TabVisibilityItem, } from '@/types';
  import { FCBSetting, TopicFolder, Entry, Session, Campaign } from '@/classes';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const settingDirectoryStore = useSettingDirectoryStore();
  const navigationStore = useNavigationStore();
  const relationshipStore = useRelationshipStore();
  const playingStore = usePlayingStore();
  const backendStore = useBackendStore();
  const { currentSetting, currentEntry, refreshCurrentEntry } = useContentState();
  const { currentPlayedCampaign } = storeToRefs(playingStore);
  const { isGeneratingImage, available } = storeToRefs(backendStore);

  // per-panel derived state for entry relationships
  const entryDerivedState = useEntryDerivedState();
  provide(ENTRY_DERIVED_STATE_KEY, entryDerivedState);

  ////////////////////////////////
  // data
  const topicData = {
    [Topics.Character]: { namePlaceholder: 'placeholders.characterName', },
    [Topics.Location]: { namePlaceholder: 'placeholders.locationName', },
    [Topics.Organization]: { namePlaceholder: 'placeholders.organizationName', },
  };

  const topicTabMap: Record<ValidTopic, Record<string, TabVisibilityItem>> = {
    [Topics.Character]: {
      journals: TabVisibilityItem.EntryCharacterJournals,
      characters: TabVisibilityItem.EntryCharacterCharacters,
      locations: TabVisibilityItem.EntryCharacterLocations,
      organizations: TabVisibilityItem.EntryCharacterOrganizations,
      pcs: TabVisibilityItem.EntryCharacterPCs,
      sessions: TabVisibilityItem.EntryCharacterSessions,
      foundry: TabVisibilityItem.EntryCharacterFoundry,
      actors: TabVisibilityItem.EntryCharacterActors,
      timeline: TabVisibilityItem.EntryCharacterTimeline,
    },
    [Topics.Location]: {
      journals: TabVisibilityItem.EntryLocationJournals,
      characters: TabVisibilityItem.EntryLocationCharacters,
      locations: TabVisibilityItem.EntryLocationLocations,
      organizations: TabVisibilityItem.EntryLocationOrganizations,
      pcs: TabVisibilityItem.EntryLocationPCs,
      sessions: TabVisibilityItem.EntryLocationSessions,
      foundry: TabVisibilityItem.EntryLocationFoundry,
      scenes: TabVisibilityItem.EntryLocationScenes,
      timeline: TabVisibilityItem.EntryLocationTimeline,
    },
    [Topics.Organization]: {
      journals: TabVisibilityItem.EntryOrganizationJournals,
      characters: TabVisibilityItem.EntryOrganizationCharacters,
      locations: TabVisibilityItem.EntryOrganizationLocations,
      organizations: TabVisibilityItem.EntryOrganizationOrganizations,
      pcs: TabVisibilityItem.EntryOrganizationPCs,
      sessions: TabVisibilityItem.EntryOrganizationSessions,
      foundry: TabVisibilityItem.EntryOrganizationFoundry,
      timeline: TabVisibilityItem.EntryOrganizationTimeline,
    },
    [Topics.PC]: {
      journals: TabVisibilityItem.EntryPCJournals,
      characters: TabVisibilityItem.EntryPCCharacters,
      locations: TabVisibilityItem.EntryPCLocations,
      organizations: TabVisibilityItem.EntryPCOrganizations,
      foundry: TabVisibilityItem.EntryPCFoundry,
      timeline: TabVisibilityItem.EntryPCTimeline,
    },
  };

  const relationships = [
    { tab: 'characters', label: 'labels.tabs.entry.characters', topic: Topics.Character },
    { tab: 'locations', label: 'labels.tabs.entry.locations', topic: Topics.Location },
    { tab: 'organizations', label: 'labels.tabs.entry.organizations', topic: Topics.Organization },
    { tab: 'pcs', label: 'labels.tabs.entry.pcs', topic: Topics.PC },
  ] as { tab: string; label: string; topic: Topics }[];

  const topic = computed(() => currentEntry.value?.topic || null);
  const name = ref<string>('');

  const parentId = ref<string | null>(null);
  const validParents = ref<{id: string; label: string}[]>([]);

  const pushButtonTitle = ref<string>('');
  const pushButtonDisabled = ref<boolean>(false);
  const showRelatedEntriesDialog = ref<boolean>(false);
  const pendingAddedUUIDs = ref<string[]>([]);
  const pendingRemovedUUIDs = ref<string[]>([]);

  const descriptionHeight = ref<number>(15);  // for handling description editor height

  // Voice recording state
  const showRecordingDialog = ref<boolean>(false);
  const activeRecorder = ref<MediaRecorder | null>(null);
  const activeStream = ref<MediaStream | null>(null);
  const activeMimeType = ref<string>('audio/webm');

  ////////////////////////////////
  // computed data
    
  const tabVisibility = computed(() => {
    ModuleSettings.getReactiveVersion();
    return ModuleSettings.get(SettingKey.tabVisibilitySettings);
  });

  const icon = computed((): string => (!topic.value ? '' : getTopicIcon(topic.value)));
  const namePlaceholder = computed((): string => (topic.value===null ? '' : (localize(topicData[topic.value]?.namePlaceholder || '') || '')));
  const canGenerate = computed(() => topic.value && [Topics.Character, Topics.Location, Topics.Organization].includes(topic.value));
  const generateDisabled = computed(() => !available.value);
  const showHierarchy = computed((): boolean => (topic.value===null ? false : hasHierarchy(topic.value)));

  // Voice recording computed properties
  const showVoiceButton = computed(() => {
    return ModuleSettings.get(SettingKey.enableVoiceRecording) &&
           topic.value === Topics.Character &&
           VoiceRecordingService.isRecordingSupported();
  });

  // Whitelist supplement for tags - include actor tags for characters, scene tags for locations
  const tagsWhitelistSupplement = computed((): string[] => {
    if (topic.value === Topics.Character) {
      const actorTags = ModuleSettings.get(SettingKey.actorTags);
      return actorTags.map((t: { name: string }) => t.name);
    }
    if (topic.value === Topics.Location) {
      const sceneTags = ModuleSettings.get(SettingKey.sceneTags);
      return sceneTags.map((t: { name: string }) => t.name);
    }
    return [];
  });

  const voiceButtonTitle = computed(() => {
    if (!currentEntry.value?.voiceRecordingPath) {
      return localize('tooltips.voiceRecordingNone');
    }
    return localize('tooltips.voiceRecordingExists');
  });

  // Foundry document button computed properties
  const showFoundryDocButton = computed(() => {
    return topic.value && [Topics.Character, Topics.Location].includes(topic.value);
  });

  const foundryDocButtonDisabled = computed(() => {
    if (!currentEntry.value) {
      return true;
    }
    if (topic.value === Topics.Character) {
      return currentEntry.value.actors.length === 0;
    }
    if (topic.value === Topics.Location) {
      return currentEntry.value.scenes.length === 0;
    }
    return true;
  });

  const foundryDocButtonIcon = computed(() => {
    return topic.value === Topics.Character ? 'fa-user' : 'fa-map';
  });

  const foundryDocButtonTitle = computed(() => {
    if (topic.value === Topics.Character) {
      return currentEntry.value?.actors.length ? localize('tooltips.openFoundryActor') : localize('tooltips.noActorsAttached');
    }

    if (topic.value === Topics.Location) {
      return currentEntry.value?.scenes.length ? localize('tooltips.openFoundryScene') : localize('tooltips.noScenesAttached');
    }
    return '';
  });

  const showTimelineTab = computed(() => {
    return ModuleSettings.get(SettingKey.useTimeline) && 
      calendariaAvailable.value && 
      calendarActive.value;
  });

  const customFieldContentType = computed<CustomFieldContentType | null>(() => {
    switch (topic.value) {
      case Topics.Character:
        return CustomFieldContentType.Character;
      case Topics.Location:
        return CustomFieldContentType.Location;
      case Topics.Organization:
        return CustomFieldContentType.Organization;
      case Topics.PC:
        return CustomFieldContentType.PC;
      default:
        return null;
    }
  });

  const tabs = computed(() => {
    const baseTabs = [
      { id: 'description', label: localize('labels.description') },
    ] as ContentTabDescriptor[];
    // TODO-PC - only show the PC tab if there's already a connection... rare that we'd need to add from here 
    // Journals tab
    if (topic.value && tabVisibility.value[topicTabMap[topic.value]['journals']]) {
      baseTabs.push({ id: 'journals', label: localize('labels.journals') });
    }

    // Relationship tabs (characters, locations, organizations, pcs)
    for (const relationship of relationships) {
      if (topic.value && tabVisibility.value[topicTabMap[topic.value][relationship.tab]]) {
        baseTabs.push({ id: relationship.tab, label: localize(relationship.label) });
      }
    }

    // Actors tab (Character only)
    if (topic.value === Topics.Character && tabVisibility.value[topicTabMap[topic.value]['actors']]) {
      baseTabs.push({ id: 'actors', label: localize('labels.actors') });
    }

    // Scenes tab (Location only)
    if (topic.value === Topics.Location && tabVisibility.value[topicTabMap[topic.value]['scenes']]) {
      baseTabs.push({ id: 'scenes', label: localize('labels.scenes') });
    }

    // Sessions tab (not for PC)
    if (topic.value && topic.value !== Topics.PC && tabVisibility.value[topicTabMap[topic.value]['sessions']]) {
      baseTabs.push({ id: 'sessions', label: localize('labels.sessions') });
    }

    // Foundry tab
    if (topic.value && tabVisibility.value[topicTabMap[topic.value]['foundry']]) {
      baseTabs.push({ id: 'foundry', label: localize('labels.tabs.entry.foundry') });
    }

    if (topic.value && showTimelineTab.value && tabVisibility.value[topicTabMap[topic.value]['timeline']]) {
      baseTabs.push({ id: 'timeline', label: localize('labels.tabs.entry.timeline') });
    }

    return baseTabs;
  });

  ////////////////////////////////
  // methods
  const refreshEntry = async () => {
    // refresh this so we can capture changes to campaigns as soon as they happen
    await updatePushButton();

    if (currentEntry.value && currentEntry.value.uuid) {
      let newTopicFolder: TopicFolder | null;

      newTopicFolder = await currentEntry.value.getTopicFolder();
      if (!newTopicFolder) 
        throw new Error('Invalid entry topic in EntryContent.refreshEntry');

      // we're going to show a content page
      // load starting data values
      name.value = currentEntry.value.name || '';

      // set the parent and valid parents
      if (currentSetting.value) {    
        parentId.value = await currentEntry.value.getParentId();

        validParents.value = validParentItems(currentSetting.value as FCBSetting, currentEntry.value).map((e)=> ({
          id: e.id,
          label: e.name || '',
        }));
      }
    }
  };

  /** are there campaigns with available sessions? */
  const availableCampaigns = async (): Promise<Campaign[]> => {
    if (!currentSetting.value)
      return [];

    const retval = [] as Campaign[];

    // otherwise check all campaigns until we find one with sessions that don't have it
    for (const campaign of Object.values(currentSetting.value?.campaigns || {})) {
      if (campaign.currentSessionNumber == null || !campaign.currentSessionId)
        continue;

      const session = await Session.fromUuid(campaign.currentSessionId);

      if (!session)
        continue;

      if (!session.npcs.find((npc) => npc.uuid===currentEntry.value?.uuid)) {
        retval.push(campaign);
      }
    }

    return retval;
  };

  // this is a bit odd, but using computed functions doesn't work because they don't update when campaigns are added, etc. and it seemed like a lot of overhead to capture changes there just for this title
  const updatePushButton = async (): Promise<void> => {    
    if ((await availableCampaigns()).length === 0) {
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

  const onDescriptionEditorResized = async (height: number) => {
    if (!currentEntry.value)
      return;
    
    descriptionHeight.value = height;
    currentEntry.value?.setCustomFieldHeight('###description###', height);
    await currentEntry.value?.save();
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
        name.value = currentEntry.value?.name!;
        return;
      }

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

    // if there are no campaigns, exit
    const numCampaigns = Object.keys(currentSetting.value.campaigns).length;
    if (numCampaigns===0)
      return;

    // if there's only one campaign, we can just push it
    if (numCampaigns===1) {
      await selectCampaignForPush(Object.keys(currentSetting.value.campaigns)[0]);
      return;
    }

    // we have more than one; now find all the campaigns with an active session
    let campaignsWithSessions = (await availableCampaigns()).map((c) => ({
      uuid: c.uuid,
      name: c.name,
      currentSessionId: c.currentSessionId,
      currentSessionNumber: c.currentSessionNumber,
    }));

    // if there aren't any, we're done (though this should never happen because the button shouldn't be enabled)
    if (campaignsWithSessions.length===0) {
      return;
    }

    // if there's more than one, we need the menu
    interface MenuItem {
      label: string;
      onClick: () => void | Promise<void>;
      customClass?: string;
      divided?: 'down' | undefined;
    };

    let menuItems = [] as MenuItem[];

    // if we're in play mode with an active session, put that at the top
    let currentCampaignId: string | null = null;
    let activeItem: MenuItem | null = null;
    if (currentPlayedCampaign.value?.currentSessionId) {
      currentCampaignId = currentPlayedCampaign.value.uuid;
      const currentCampaign = campaignsWithSessions.find((c) => c.uuid===currentCampaignId);

      if (currentCampaign) {
        activeItem = {
          label: `${currentCampaign.name} (#${currentCampaign.currentSessionNumber})`,        
          customClass: 'push-to-active-campaign-menu-item',
          onClick: async () => { await selectCampaignForPush(currentCampaignId as string); },
          divided: campaignsWithSessions.length > 1 ? 'down' : undefined,
        };
      }
    }

    // check for any other campaigns
    for (const campaign of campaignsWithSessions) {
      // skip the one we added above
      if (campaign.uuid === currentCampaignId)
        continue;

      // skip ones without sessions
      if (!campaign.currentSessionId)
        continue;

      menuItems.push({
        label: `${campaign.name} (#${campaign.currentSessionNumber})`,        
        onClick: async () => { await selectCampaignForPush(campaign.uuid); },
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
    if (!campaign || !campaign.currentSessionId)
      return;

    // get the session
    const session = await Session.fromUuid(campaign.currentSessionId);
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

    notifyInfo(`${currentEntry.value.name} ${localize('notifications.addedToSession')}: ${session.name} (#${session.number})`);
    await updatePushButton();// # of available changed
  };

  const onGenerateButtonClick = (event: MouseEvent): void => {
    // Prevent default behavior
    event.preventDefault();
    event.stopPropagation();

    if (topic.value != null && ![Topics.Character, Topics.Location, Topics.Organization, Topics.PC].includes(topic.value)) {
      return;
    }

    // Show context menu
    const menuItems = [
      {
        icon: 'fa-file-lines',
        iconFontClass: 'fas',
        label: localize('contextMenus.generate.nameAndDescription'),        
        disabled: false,
        onClick: async () => {
          if (currentEntry.value)
            await updateEntryDialog(currentEntry.value);
        }
      },
    ];

    // PC images always tie to actor
    if (topic.value!==Topics.PC) {
      menuItems.push({
        icon: 'fa-image',
        iconFontClass: 'fas',
        label: `${localize('contextMenus.generate.image')} ${isGeneratingImage.value[currentEntry.value?.uuid as string] ? ` - ${localize('contextMenus.generate.inProgress')}` : ''}`,
        disabled: isGeneratingImage.value[currentEntry.value?.uuid as string],
        onClick: async () => {
          if (currentSetting.value && currentEntry.value) {
            await generateImage(currentSetting.value, WindowTabType.Entry, currentEntry.value);
          }
        }
      });
    }

    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: menuItems,
    });
  };

  /**
   * Handle voice button click - show context menu with record/play/delete options.
   */
  const onVoiceButtonClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();

    const hasRecording = !!currentEntry.value?.voiceRecordingPath;

    const menuItems = [
      {
        icon: 'fa-microphone',
        iconFontClass: 'fas',
        label: localize('contextMenus.voice.record'),
        disabled: false,
        onClick: () => onRecordVoice(),
      },
      {
        icon: 'fa-play',
        iconFontClass: 'fas',
        label: localize('contextMenus.voice.play'),
        disabled: !hasRecording,
        onClick: () => onPlayVoice(),
      },
      {
        icon: 'fa-trash',
        iconFontClass: 'fas',
        label: localize('contextMenus.voice.delete'),
        disabled: !hasRecording,
        onClick: () => onDeleteVoice(),
      },
      {
        icon: 'fa-folder-open',
        iconFontClass: 'fas',
        label: localize('contextMenus.voice.changeFolder'),
        disabled: false,
        onClick: () => onChangeVoiceFolder(),
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

  /**
   * Handle Foundry document button click - open actor sheet or activate scene.
   * If multiple documents are attached, show a context menu to select which one.
   */
  const onFoundryDocButtonClick = async (event: MouseEvent): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();

    if (!currentEntry.value || !topic.value) {
      return;
    }

    // Get the appropriate document list based on topic
    const docUuids = topic.value === Topics.Character 
      ? currentEntry.value.actors 
      : topic.value === Topics.Location 
        ? currentEntry.value.scenes 
        : [];

    if (docUuids.length === 0) {
      return;
    }

    // If only one document, open/activate it directly
    if (docUuids.length === 1) {
      await openFoundryDocument(docUuids[0]);
      return;
    }

    // Multiple documents - show context menu
    const menuItems = await Promise.all(docUuids.map(async (uuid) => {
      const doc = await foundry.utils.fromUuid(uuid);
      return {
        icon: topic.value === Topics.Character ? 'fa-user' : 'fa-map',
        iconFontClass: 'fas',
        label: doc?.name || 'Unknown',
        onClick: async () => {
          await openFoundryDocument(uuid);
        }
      };
    }));

    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: menuItems,
    });
  };

  /**
   * Open a Foundry document - actor sheet or scene activation.
   */
  const openFoundryDocument = async (uuid: string): Promise<void> => {
    const doc = await foundry.utils.fromUuid(uuid);
    if (!doc) {
      return;
    }

    if (topic.value === Topics.Character) {
      // Open actor sheet
      await (doc as Actor).sheet?.render(true);
    } else if (topic.value === Topics.Location) {
      await (doc as Scene).view();
    }
  };

  /**
   * Start recording voice for the current character.
   */
  const onRecordVoice = async (): Promise<void> => {
    if (!currentEntry.value) {
      return;
    }

    // Ensure folder is configured before starting recording
    const folder = await VoiceRecordingService.ensureFolderConfigured();
    if (!folder) {
      // User cancelled folder selection
      return;
    }

    // Check for existing recording and confirm overwrite
    if (currentEntry.value.voiceRecordingPath) {
      const confirmed = await FCBDialog.confirmDialog(
        localize('dialogs.voiceRecording.overwriteTitle'),
        localize('dialogs.voiceRecording.overwriteMessage'),
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      // Start recording
      const { recorder, stream, mimeType } = await VoiceRecordingService.startRecording();
      
      // Store references for the dialog
      activeRecorder.value = recorder;
      activeStream.value = stream;
      activeMimeType.value = mimeType;

      // Collect data as it becomes available
      recorder.start();

      // Show the recording dialog
      showRecordingDialog.value = true;
    } catch (error) {
      // Handle permission denied or other errors
      notifyError(localize('notifications.voiceRecording.permissionDenied'));
    }
  };

  /**
   * Handle recording stopped - upload and save the recording.
   */
  const onRecordingStopped = async (blob: Blob): Promise<void> => {
    if (!currentEntry.value) {
      return;
    }

    try {
      // Upload the recording to Foundry
      const path = await VoiceRecordingService.uploadRecording(blob, currentEntry.value.name, activeMimeType.value);

      // If path is null, user cancelled the folder selection or upload failed
      if (!path) {
        return;
      }

      // Save the path to the entry
      currentEntry.value.voiceRecordingPath = path;
      await currentEntry.value.save();

      notifyInfo(localize('notifications.voiceRecording.saved'));
    } catch (error) {
      notifyError(localize('notifications.voiceRecording.uploadFailed'));
    } finally {
      // Clean up
      showRecordingDialog.value = false;
      activeRecorder.value = null;
      activeStream.value = null;
      activeMimeType.value = 'audio/webm';
    }
  };

  /**
   * Handle recording error from the dialog.
   */
  const onRecordingError = (): void => {
    notifyError(localize('notifications.voiceRecording.uploadFailed'));
    // Clean up
    showRecordingDialog.value = false;
    activeRecorder.value = null;
    activeStream.value = null;
    activeMimeType.value = 'audio/webm';
  };

  /**
   * Handle recording cancelled (e.g., dialog unmounted while recording).
   */
  const onRecordingCancelled = (): void => {
    // Clean up - no notification needed since this is an intentional cancel
    showRecordingDialog.value = false;
    activeRecorder.value = null;
    activeStream.value = null;
    activeMimeType.value = 'audio/webm';
  };

  /**
   * Cancel any active recording (called on unmount).
   */
  const cancelActiveRecording = (): void => {
    if (activeRecorder.value && activeRecorder.value.state !== 'inactive') {
      VoiceRecordingService.cancelRecording(activeRecorder.value, activeStream.value);
    }
    // Clean up refs
    activeRecorder.value = null;
    activeStream.value = null;
    activeMimeType.value = 'audio/webm';
  };

  /**
   * Play the voice recording for the current character.
   */
  const onPlayVoice = async (): Promise<void> => {
    if (!currentEntry.value?.voiceRecordingPath) {
      return;
    }

    try {
      await VoiceRecordingService.playRecording(currentEntry.value.voiceRecordingPath);
    } catch (error) {
      notifyError(localize('notifications.voiceRecording.uploadFailed'));
    }
  };

  /**
   * Delete the voice recording for the current character.
   */
  const onDeleteVoice = async (): Promise<void> => {
    if (!currentEntry.value) {
      return;
    }

    const confirmed = await FCBDialog.confirmDialog(
      localize('dialogs.voiceRecording.deleteTitle'),
      localize('dialogs.voiceRecording.deleteMessage'),
    );

    if (!confirmed) {
      return;
    }

    // Clear the path (file remains on server since Foundry can't delete files)
    currentEntry.value.voiceRecordingPath = null;
    await currentEntry.value.save();

    notifyInfo(localize('notifications.voiceRecording.deleted'));
  };

  /**
   * Change the voice recording folder.
   */
  const onChangeVoiceFolder = async (): Promise<void> => {
    await VoiceRecordingService.selectFolder();
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

  const onTagClick = async (tagName: string): Promise<void> => {
    // Open the tag results tab for the clicked tag
    await navigationStore.openTagResults(tagName, { newTab: true, activate: true });
  }

  const onTypeSelectionMade = async (selection: string) => {
    if (currentEntry.value) {
      const oldType = currentEntry.value.type;
      currentEntry.value.type = selection;
      await currentEntry.value.save();

      // Update the type in the directory tree
      await settingDirectoryStore.updateEntryType(currentEntry.value, oldType);

      // Propagate the type change to all related entries
      // This will also refresh any entries currently viewing the relationship data
      await relationshipStore.propagateFieldChange(currentEntry.value, 'type');
    }
  };

  const onParentSelectionMade = async (selection: string): Promise<void> => {
    if (!currentEntry.value?.topic || !currentEntry.value?.uuid)
      return;

    const topicFolder = await currentEntry.value.getTopicFolder();

    await settingDirectoryStore.setNodeParent(topicFolder, currentEntry.value.uuid, selection || null);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentEntry.value)
      return;

    currentEntry.value.description = newContent;
    await currentEntry.value.save();
  };

  const onRelatedEntriesChanged = async (addedUUIDs: string[], removedUUIDs: string[]) => {
    if (!currentEntry.value || !currentSetting.value || !ModuleSettings.get(SettingKey.autoRelationships)) {
      return;
    }

    // get the entries we actually need to check
    const { added, removed } = await getEntryRelatedEntries(addedUUIDs, removedUUIDs, currentEntry.value);

    await filterRelatedEntries(currentSetting.value, added, removed);

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
      await relationshipStore.deleteRelationship(entry.uuid);
    }
  };

  const onSpeciesSelectionMade = async (species: {id: string; label: string}): Promise<void> => {
    if (!currentEntry.value?.topic || !currentEntry.value?.uuid)
      return;

    currentEntry.value.speciesId = species.id;
    await currentEntry.value.save();
  };

  const onJournalsUpdate = async (newJournals: RelatedJournal[]) => {
    if (currentEntry.value) {
      currentEntry.value.journals = newJournals;
      await currentEntry.value.save();
    }
  };

  ////////////////////////////////
  // watchers
  
  watch(currentEntry, async (): Promise<void> => {
    await refreshEntry();

    descriptionHeight.value = currentEntry.value?.getCustomFieldHeight('###description###') || 15;

    cancelActiveRecording();
  });
  
  // see if we want to force a full refresh (ex. when parent changes externally)
  watch(refreshCurrentEntry, async (newValue: boolean): Promise<void> => {
    if (newValue) {
      await refreshEntry();
      refreshCurrentEntry.value = false;
    }
  });
  
  ////////////////////////////////
  // lifecycle events
  onUnmounted(() => {
    // Cancel any active recording when component unmounts
    cancelActiveRecording();
  });

  // Clear debounce timer on unmount
  onBeforeUnmount(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  });

</script>

<style lang="scss" scoped>
  .push-to-active-campaign-menu-item {
    font-weight: bold;
  }
  
  .tags-container {
    // TODO - search for "31" and see toDo note about changing this to rem
    min-height: 43px; /* Set a fixed minimum height for the tags container */
    position: relative;
  }

  .fcb-voice-button {
    width: 26px;
    height: 26px;
    border: none;
    border-radius: 4px;
    background: var(--fcb-primary);
    color: white;
    cursor: pointer;
    margin-left: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fcb-voice-button:hover {
    background: var(--fcb-primary-hover);
  }

  .fcb-voice-button.has-recording {
    color: var(--fcb-success);
  }

  .fcb-voice-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
