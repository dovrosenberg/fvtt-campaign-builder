<template>
  <div class="flexcol fcb-home-page">
    <div class="message">
      <div style="transform: translateY(50%);">
        {{ !message ? '' : localize(message) }}
      </div>
    </div>
    <h3>
      {{ currentWorld?.name }}
    </h3>
    <br>
    <br>
    <div style="flex:2;">
      <div class="grid-container">
        <div 
          class="row-1" 
        >
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
          class="row-2"
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
  import { useCampaignDirectoryStore, useMainStore, useNavigationStore, useTopicDirectoryStore } from '@/applications/stores';

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
  const topicDirectoryStore = useTopicDirectoryStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentWorld } = storeToRefs(mainStore);
  const { recent } = storeToRefs(navigationStore);

  ////////////////////////////////
  // data
  const message = ref<string>('');   // a message to display at the top

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const onCreateWorld = async () => {
    await topicDirectoryStore.createWorld();
  };

  const onCreateCampaign = async () => {
    await campaignDirectoryStore.createCampaign();
  };

  const onCreateCharacter = async () => {
    if (!currentWorld.value?.topicFolders[Topics.Character])
      throw new Error('No character folder in current world in HomePage.onCreateCharacter()');

    await topicDirectoryStore.createEntry(currentWorld.value.topicFolders[Topics.Character], {});
  };

  const onCreateLocation = async () => {
    if (!currentWorld.value?.topicFolders[Topics.Location])
      throw new Error('No location folder in current world in HomePage.onCreateLocation()');

    await topicDirectoryStore.createEntry(currentWorld.value.topicFolders[Topics.Location], {});
  };

  const onCreateOrganization = async () => {
    if (!currentWorld.value?.topicFolders[Topics.Organization])
      throw new Error('No organization folder in current world in HomePage.onCreateOrganization()');

    await topicDirectoryStore.createEntry(currentWorld.value.topicFolders[Topics.Organization], {});
  };

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
      padding: 12px 24px;
      border-radius: 4px;
      transition: all 0.2s ease;
      background: rgba(255, 255, 255, 0.05);

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

    .grid-container {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 20px;
      justify-items: center;
    }

    .row-1 {
      grid-row: 1;
      grid-column: 2 / span 2;
      display: contents;
    }

    .row-1 > div:nth-child(1) {
      grid-column: 2;
    }

    .row-1 > div:nth-child(2) {
      grid-column: 4;
    }

    .row-2 {
      grid-row: 2;
      grid-column: 1 / -1;
      display: contents;
    }

    .row-2 > div:nth-child(1) {
      grid-column: 1;
    }
    .row-2 > div:nth-child(2) {
      grid-column: 3;
    }
    .row-2 > div:nth-child(3) {
      grid-column: 5;
    }
  }
</style>