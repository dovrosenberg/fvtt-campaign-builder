<template>
  <div class="flexcol fcb-home-page">
    <div class="message">
      <div style="transform: translateY(50%);">
        {{ !message ? '' : localize(message) }}
      </div>
    </div>
    <h3>
      {{ currentSetting?.name }}
    </h3>
    <br>
    <br>
    <div style="flex:2;">
      <div class="flexrow">
        <div 
          class="new-link"
          @click="onCreateWorld"
        >
          <div><i class="fas fa-globe"></i></div>
          {{ localize('labels.homePage.createWorld') }}
        </div>
        <div 
          class="new-link"
          @click="onCreateCampaign"
        >
          <div><i class="fas fa-book"></i></div>
          {{ localize('labels.homePage.createCampaign') }}
        </div>
      </div>

      <div 
        class="flexrow"
        style="margin-bottom: 20px;"
      >
        <div 
          class="new-link"
          @click="onCreateCharacter"
        >
          <div><i :class="`fas ${getTopicIcon(Topics.Character)}`"></i></div>
          {{ localize('labels.homePage.createCharacter') }}
        </div>
        <div 
          class="new-link"
          @click="onCreateLocation"
        >
          <div><i :class="`fas ${getTopicIcon(Topics.Location)}`"></i></div>
          {{ localize('labels.homePage.createLocation') }}
        </div>
        <div 
          class="new-link"
          @click="onCreateOrganization"
        >
          <div><i :class="`fas ${getTopicIcon(Topics.Organization)}`"></i></div>
          {{ localize('labels.homePage.createOrganization') }}
        </div>
      </div>

      <div class="search-container">
        <Search class="fcb-global-search" @result-selected="onSearchResultSelected" />
      </div>

      <div class="flexrow">
        <div 
          v-for="recentItem, idx in recent"
          :key="idx"
          class="recent-link" 
          @click="onRecentClick(recentItem)"
        >
          <div>
            <i :class="`fas ${recentItem.icon}`"></i>
          </div>
          {{ recentItem.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { getTabTypeIcon, getTopicIcon } from '@/utils/misc';
  import { useCampaignDirectoryStore, useMainStore, useNavigationStore, useSettingDirectoryStore } from '@/applications/stores';
  import { FCBDialog } from '@/dialogs';
  
  // library components

  // local components
  import Search from '../Search.vue';

  // types
  import { TabHeader, Topics, WindowTabType } from '@/types';


  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const settingDirectoryStore = useSettingDirectoryStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentSetting } = storeToRefs(mainStore);
  const { recent } = storeToRefs(navigationStore);

  ////////////////////////////////
  // data
  const message = ref<string>('');   // a message to display at the top

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const onCreateWorld = async () => {
    await settingDirectoryStore.createWorld();
  };

  const onCreateCampaign = async () => {
    await campaignDirectoryStore.createCampaign();
  };

  const onCreateCharacter = async () => {
    await onCreateEntry(Topics.Character);
  };

  const onCreateLocation = async () => {
    await onCreateEntry(Topics.Location);
  };

  const onCreateOrganization = async () => {
    await onCreateEntry(Topics.Organization);
  };

  const onCreateEntry = async (topic: Topics) => {
    if (!currentSetting.value)
      throw new Error('No current world in HomePage.onCreateEntry()');

    const topicFolder = currentSetting.value.topicFolders[topic];

    if (!topicFolder)
      throw new Error('No topic folder in HomePage.onCreateEntry()');

    const entry = await FCBDialog.createEntryDialog(topicFolder.topic, { } );

    if (entry) {
      await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, }); 
    }
  }

  ////////////////////////////////
  // event handlers
  
  // Handle search result selection
  const onSearchResultSelected = (uuid: string) => {
    // The navigation is handled in the Search component
    // This is just a hook for any additional processing needed at the home page level
  };
  
  const onRecentClick = async (item: TabHeader) => {
    if (item.uuid) {
      // a little goofy, but we do it by icon
      switch (item.icon) {
        case getTopicIcon(Topics.Character):
        case getTopicIcon(Topics.Location):
        case getTopicIcon(Topics.Organization):
          await navigationStore.openEntry(item.uuid, { newTab: false });
          break;

        case getTabTypeIcon(WindowTabType.World):
          await navigationStore.openWorld(item.uuid, { newTab: false });
          break;

        case getTabTypeIcon(WindowTabType.Campaign):
          await navigationStore.openCampaign(item.uuid, { newTab: false });
          break;

        case getTabTypeIcon(WindowTabType.Session):
          await navigationStore.openSession(item.uuid, { newTab: false });
          break;

        case getTabTypeIcon(WindowTabType.PC):
          await navigationStore.openPC(item.uuid, { newTab: false });
          break;

          default:
          throw new Error(`Unknown item icon type in HomePage.onRecentClick(): ${item.icon}`);
      }
    }
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
  /* Blank */
  .fcb-home-page {
    display: flex;
    text-align: center;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-16);
    color: var(--fcb-blank-color);
    font-weight: bold;

    .message {
      flex: 1;
      display: flex;
      justify-content: center;
      width: 100%;
      font-size: var(--font-size-24);
      font-style: italic;
    }

    .search-container {
      margin-bottom: 20px;
      width: 100%;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .fcb-global-search {
        width: 100%;
        max-width: 180px;
      }
    }

    .flexrow {
      display: flex;
      justify-content: center;
      gap: 20px;
    }

    .recent-link,
    .new-link {
      cursor: pointer;
      padding: 12px 0;
      max-width: 130px;

      i {
        font-size: 24px;
        margin-bottom: 8px;
      }
    }

    .recent-link:hover,
    .new-link:hover {
      color: var(--fcb-blank-link-hover);
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }
  }
</style>