<template>
  <!-- PCs use their own thing because their image works differently -->
  <PCContent v-if="topic===Topics.PC" />
  <form v-else>
    <div ref="contentRef" class="fcb-sheet-container flexcol">
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
          :tag-setting="SettingKey.entryTags"
          @tag-added="onTagChange"
          @tag-removed="onTagChange"
        />
      </div>
      <div class="fcb-sheet-subtab-container flexrow">
        <div class="fcb-subtab-wrapper">
          <nav class="fcb-sheet-navigation flexrow tabs" data-group="primary">
            <a class="item" data-tab="description">{{ localize('labels.tabs.entry.description') }}</a>
            <a class="item" data-tab="journals">{{ localize('labels.tabs.entry.journals') }}</a>
            <!-- TODO-PC - only show the PC tab if there's already a connection... rare that we'd need to add from here -->
            <a 
              v-for="relationship in relationships"
              :key="relationship.tab"
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
              v-if="topic!==Topics.PC"
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
                  :allow-new-items="false"
                  @selection-made="onParentSelectionMade"
                />
              </div>

              <!-- Above description if we're in play mode -->
              <div 
                v-if="roleplayAboveDescription"
                class="flexrow form-group"
              >
                <LabelWithHelp
                  label-text="labels.fields.entryRolePlayingNotes"
                  top-label
                />
              </div>
              <div 
                v-if="roleplayAboveDescription"
                class="flexrow form-group"
              >
                <Editor
                    :initial-content="currentEntry?.roleplayingNotes || ''"
                    :style="{ 'height': '180px', 'margin-bottom': '.375rem'}"
                    :current-entity-uuid="currentEntry?.uuid"
                    @editor-saved="onRolePlayingNotesSaved"
                  />
              </div>

              <div class="flexrow form-group">
                <LabelWithHelp
                  label-text="labels.fields.entryDescription"
                  top-label
                />
              </div>
              <div class="flexrow form-group description">
                <Editor
                  :initial-content="currentEntry?.description || ''"
                  :current-entity-uuid="currentEntry?.uuid"
                  :enable-related-entries-tracking="ModuleSettings.get(SettingKey.autoRelationships)"
                  :style="{ 'height': '240px', 'margin-bottom': '.375rem'}"
                  @editor-saved="onDescriptionEditorSaved"
                  @related-entries-changed="onRelatedEntriesChanged"
                />
              </div>

              <!-- Below description if we're in prep mode -->
              <div 
                v-if="roleplayBelowDescription"
                class="flexrow form-group"
              >
                <LabelWithHelp
                  label-text="labels.fields.entryRolePlayingNotes"
                  top-label
                />
              </div>
              <div 
                v-if="roleplayBelowDescription"
                class="flexrow form-group"
              >
                <Editor
                    :initial-content="currentEntry?.roleplayingNotes || ''"
                    :style="{ 'height': '180px', 'margin-bottom': '.375rem'}"
                    :current-entity-uuid="currentEntry?.uuid"
                    @editor-saved="onRolePlayingNotesSaved"
                  />
              </div>

            </DescriptionTab>
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
                <RelatedItemTable :topic="relationship.topic as ValidTopic" />
              </div>
            </div>
            <div 
              v-if="topic===Topics.Location"
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
              v-if="topic===Topics.Character"
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
            <div class="tab flexcol" data-group="primary" data-tab="sessions">
              <SessionsTab />
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
  import { computed, nextTick, onMounted, ref, watch, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getTopicIcon, } from '@/utils/misc';
  import { localize } from '@/utils/game';
  import { useSettingDirectoryStore, useMainStore, useNavigationStore, useRelationshipStore, usePlayingStore, } from '@/applications/stores';
  import { hasHierarchy, validParentItems, } from '@/utils/hierarchy';
  import { generateImage } from '@/utils/generation';
  import { ModuleSettings, SettingKey } from '@/settings';
  import { notifyInfo, notifyWarn } from '@/utils/notifications';  
  import { updateEntryDialog } from '@/dialogs/createEntry';

  // library components
  import InputText from 'primevue/inputtext';
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import DescriptionTab from '@/components/ContentTab/DescriptionTab.vue';
  import JournalTab from '@/components/ContentTab/JournalTab.vue';
  import PCContent from '@/components/ContentTab/PCContent.vue';
  import RelatedItemTable from '@/components/tables/RelatedItemTable.vue';
  import RelatedDocumentTable from '@/components/tables/RelatedDocumentTable.vue';
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
  import { DocumentLinkType, Topics, ValidTopic, WindowTabType, RelatedJournal } from '@/types';
  import { FCBSetting, TopicFolder, Backend, Entry, Session } from '@/classes';
  import { DOCUMENT_TYPES } from '@/documents';


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
  const { isInPlayMode } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const topicData = {
    [Topics.Character]: { namePlaceholder: 'placeholders.characterName', },
    [Topics.Location]: { namePlaceholder: 'placeholders.locationName', },
    [Topics.Organization]: { namePlaceholder: 'placeholders.organizationName', },
  };

  const relationships = [
    { tab: 'characters', label: 'labels.tabs.entry.characters', topic: Topics.Character },
    { tab: 'locations', label: 'labels.tabs.entry.locations', topic: Topics.Location },
    { tab: 'organizations', label: 'labels.tabs.entry.organizations', topic: Topics.Organization },
    { tab: 'pcs', label: 'labels.tabs.entry.pcs', topic: Topics.PC },
  ] as { tab: string; label: string; topic: Topics }[];

  const tabs = ref<foundry.applications.ux.Tabs>();
  const topic = ref<Topics | null>(null);
  const name = ref<string>('');

  const contentRef = ref<HTMLElement | null>(null);
  const parentId = ref<string | null>(null);
  const validParents = ref<{id: string; label: string}[]>([]);

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
  const roleplayAboveDescription = computed(() => ModuleSettings.get(SettingKey.showRolePlayingNotes) && isInPlayMode.value);
  const roleplayBelowDescription = computed(() => ModuleSettings.get(SettingKey.showRolePlayingNotes) && !isInPlayMode.value);

  ////////////////////////////////
  // methods
  const refreshEntry = async () => {
    // refresh this so we can capture changes to campaigns as soon as they happen
    updatePushButton();

    if (!currentEntry.value || !currentEntry.value.uuid) {
      topic.value = null;
    } else {
      let newTopicFolder: TopicFolder | null;

      newTopicFolder = await currentEntry.value.getTopicFolder();
      if (!newTopicFolder) 
        throw new Error('Invalid entry topic in EntryContent.refreshEntry');

      // we're going to show a content page
      topic.value = newTopicFolder.topic;

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

  const mountTabs = async () => {
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

    if (contentRef.value) {
      tabs.value.bind(contentRef.value);
    }

    if (tabs.value) {
      tabs.value.activate(currentContentTab.value || 'description');
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
      
      // name can't be blank
      if (newValue.trim() === '') {
        notifyWarn(localize('errors.nameRequired'));
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

    // e have more than one; now find all the campaigns with an active session
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
      
      activeItem = {
        label: `${campaigns[currentCampaignId].name} (#${campaigns[currentCampaignId].currentSessionNumber})`,        
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
      if (!campaigns[campaignId].currentSessionId)
        continue;

      menuItems.push({
        label: `${campaigns[campaignId].name} (#${campaigns[campaignId].currentSessionNumber})`,        
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

    notifyInfo(`${currentEntry.value.name} ${localize('notifications.addedToSession')}`);
    updatePushButton();// # of available changed
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
        label: localize('contextMenus.generate.description'),        
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
        label: `${localize('contextMenus.generate.image')} ${Backend.isGeneratingImage[currentEntry.value?.uuid as string] ? ` - ${localize('contextMenus.generate.inProgress')}` : ''}`,
        disabled: Backend.isGeneratingImage[currentEntry.value?.uuid as string],
        onClick: async () => {
          if (currentSetting.value && currentEntry.value) {
            await generateImage(currentSetting.value, currentEntry.value);
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

    const topicFolder = await currentEntry.value.getTopicFolder();

    await settingDirectoryStore.setNodeParent(topicFolder, currentEntry.value.uuid, selection || null);
  };

  const onDescriptionEditorSaved = async (newContent: string) => {
    if (!currentEntry.value)
      return;

    currentEntry.value.description = newContent;
    await currentEntry.value.save();
  };


  const onRolePlayingNotesSaved = async (newContent: string) => {
    if (!currentEntry.value)
      return;

    currentEntry.value.roleplayingNotes = newContent;
    await currentEntry.value.save();
  };

  const onRelatedEntriesChanged = async (addedUUIDs: string[], removedUUIDs: string[]) => {
    if (!currentEntry.value || !ModuleSettings.get(SettingKey.autoRelationships)) {
      return;
    }

    // check against current relationships
    const { added, removed } = await getRelatedEntries(addedUUIDs, removedUUIDs, currentEntry.value);

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

  const onJournalsUpdate = async (newJournals: RelatedJournal[]) => {
    if (currentEntry.value) {
      currentEntry.value.journals = newJournals;
      await currentEntry.value.save();
    }
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

    await mountTabs(); 
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    await mountTabs();
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
    // TODO - search for "31" and see todo note about changing this to rem
    min-height: 43px; /* Set a fixed minimum height for the tags container */
    position: relative;
  }
</style>