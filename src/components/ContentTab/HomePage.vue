<template>
  <div class="flexcol fwb-journal-subsheet blank blank-body">
    <div class="message">
      <div style="transform: translateY(50%);">
        {{ !message ? '' : localize(message) }}
      </div>
    </div>
    <h3>
      {{ currentWorldFolder?.name }}
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

      <div class="recently-viewed">
        MAKE THIS A SEARCH BAR
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
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { getTabTypeIcon, getTopicIcon } from '@/utils/misc';
  import { UserFlagKey, UserFlags } from '@/settings';
  import { useMainStore, useNavigationStore } from '@/applications/stores';

  // library components

  // local components

  // types
  import { TabHeader, Topic, WindowTabType } from '@/types';

  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorldFolder } = storeToRefs(mainStore);
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
  const onRecentClick = async (item: TabHeader) => {
    if (item.uuid) {
      // a little goofy, but we do it by icon
      switch (item.icon) {
        case getTopicIcon(Topic.Character):
        case getTopicIcon(Topic.Location):
        case getTopicIcon(Topic.Organization):
        case getTopicIcon(Topic.Event):
          await navigationStore.openEntry(item.uuid, { newTab: false });
          break;

        case getTabTypeIcon(WindowTabType.Campaign):
          await navigationStore.openCampaign(item.uuid, { newTab: false });
          break;

        case getTabTypeIcon(WindowTabType.Session):
          await navigationStore.openSession(item.uuid, { newTab: false });
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
  .fwb-journal-subsheet.blank {
    display: flex;
    text-align: center;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-16);
    color: var(--fwb-blank-color);
    font-weight: bold;

    .message {
      flex: 1;
      display: flex;
      justify-content: center;
      width: 100%;
      font-size: var(--font-size-24);
      font-style: italic;
    }

    .recently-viewed {
      margin-bottom: 20px;
      border-radius: 6px;
      background-color: var(--fwb-blank-recent-background);
      border: 1px solid var(--fwb-blank-recent-border);
      font-size: 20px;
      padding: 4px;
    }

    .recent-link,
    .new-link {
      cursor: pointer;
      padding: 4px;
    }

    .recent-link:hover,
    .new-link:hover {
      color: var(--fwb-blank-link-hover);
    }
  }
</style>