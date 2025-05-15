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
      <div 
        class="flexrow" 
        style="margin-bottom: 20px;"
      >
        <div class="new-link">
          <div><i class="fas fa-book-open"></i></div>
          Create New Entry
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
  import { useMainStore, useNavigationStore } from '@/applications/stores';

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
  const { currentWorld } = storeToRefs(mainStore);
  const { recent } = storeToRefs(navigationStore);

  ////////////////////////////////
  // data
  const message = ref<string>('');   // a message to display at the top

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

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
      
      .fcb-global-search {
        width: 100%;
      }
    }

    .recent-link,
    .new-link {
      cursor: pointer;
      padding: 4px;
    }

    .recent-link:hover,
    .new-link:hover {
      color: var(--fcb-blank-link-hover);
    }
  }
</style>