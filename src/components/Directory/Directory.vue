<template>
  <!-- The overall directory sidebar -->
  <div
    id="fcb-directory"
    ref="root"
    class="tab flexcol journal-directory"
  >
    <!-- Directory Header -->
    <header class="fcb-directory-header">
      <div class="fcb-header-search flexrow">
        <InputText
          v-model="filterText"
          for="fcb-directory-filter"
          unstyled
          :placeholder="localize('placeholders.filter')"
          autocomplete="off"
          :pt="{
            root: {
              class: 'full-height',
            }
          }"
        />
        <a
          class="fcb-header-control create-world create-button"
          :data-tooltip="localize('tooltips.createWorld')"
          @click="onCreateWorldClick"
        >
          <i class="fas fa-globe"></i>
          <i
            class="fas fa-plus"
            style="color: black; background: rgba(255, 255, 255, 0.7); font-size: 0.6rem;"
          >
          </i>
        </a>
        <a
          class="fcb-header-control collapse-all"
          :data-tooltip="localize('tooltips.collapseAllTopics')"
          @click="onCollapseAllClick"
        >
          <i class="fa-duotone fa-folder-tree"></i>
        </a>
      </div>
      <div class="fcb-header-group-type flexrow">
        <input
          id="fcb-group-by-type"
          type="checkbox"
          :checked="isGroupedByType"
          @change="onGroupTypeChange"
        >
        <label for="fcb-group-by-type">
          {{ localize('labels.groupTree') }}
        </label>
      </div>
    </header>

    <Splitter layout="vertical" class="fcb-directory-spliter">
      <SplitterPanel :size="60" class="fcb-directory-panel">
        <div v-if="isTopicTreeRefreshing">
          <ProgressSpinner v-if="isTopicTreeRefreshing" />
        </div>
        <div v-else class="fcb-directory-panel-wrapper">
          <TopicDirectory />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="40" class="fcb-directory-panel">
        <div class="fcb-directory-panel-wrapper">
          <CampaignDirectory />
        </div>
      </SplitterPanel>
    </Splitter>

    <!-- Directory Footer -->
    <!--
      <footer class="directory-footer action-buttons {{#if data.unavailable}}warning{{/if}}">
        {{~#if data.unavailable}}
          <i class="fa-solid fa-triangle-exclamation"></i>
          <a class="show-issues">{{localize "SUPPORT.UnavailableDocuments" count=data.unavailable document=data.label}}</a>
        {{/if~}}
      </footer>
    -->
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, } from 'vue';
  import { storeToRefs } from 'pinia';
  import ProgressSpinner from 'primevue/progressspinner';

  // local imports
  import { localize } from '@/utils/game';
  import { useTopicDirectoryStore } from '@/applications/stores';

  // library components
  import InputText from 'primevue/inputtext';
  import Splitter from 'primevue/splitter';
  import SplitterPanel from 'primevue/splitterpanel';

  // local components
  import CampaignDirectory from './CampaignDirectory/CampaignDirectory.vue';
  import TopicDirectory from './TopicDirectory/TopicDirectory.vue';
  
  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const topicDirectoryStore = useTopicDirectoryStore();
  const { filterText, isTopicTreeRefreshing, isGroupedByType } = storeToRefs(topicDirectoryStore);

  ////////////////////////////////
  // data
  const root = ref<HTMLElement>();
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // close all topics
  const onCollapseAllClick = (event: MouseEvent) => {
    event.stopPropagation();

    void topicDirectoryStore.collapseAll();
  };

  // create a world
  const onCreateWorldClick = async (event: MouseEvent) => {
    event.stopPropagation();

    // // add 400 entries
    // const wf = game.folders?.find((f)=>f.id==='IAAEn25ebbVZXL9V');
    // if (wf) {
    //   for (let i=0; i<400; i++) {
    //     await topicDirectoryStore.createEntry(Topics.Location, { name: foundry.utils.randomID() });
    //   }
    // }

    await topicDirectoryStore.createWorld();
  };

  // save grouping to settings
  const onGroupTypeChange = async (event: Event) => {
    isGroupedByType.value = (event.currentTarget as HTMLInputElement)?.checked || false;
  };
  
  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
  #fcb-directory {
    .action-buttons {
      padding-left: 30px;
    }

    .fcb-directory-spliter {
      flex: 1 1 auto;  // take up all remaining space
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .fcb-directory-panel-wrapper {
        flex: 1;
        overflow-y: auto;
        height: 100%;
      } 

      .fcb-directory-panel {
        display: flex;
        flex-direction: column;
        overflow: hidden; 
        height: 100%; 
        padding-bottom: 10px;
      }
    }

    .fcb-directory-header {
      flex: 0;
      background-color: var(--fcb-header-background);
      border-bottom: 1px solid var(--fcb-header-border-color);
      color: var(--fcb-sidebar-label-color);
      margin-bottom: 0px;
      padding: 8px 0px 8px 8px;

      .fcb-header-search {
        #fcb-directory-filter {
          flex: 1;
          height: var(--form-field-height);
        }

        .fcb-header-control {
          flex: 0 0 32px;
          justify-content: center;
          text-align: center;
          position: relative;
          display: inline-flex;
          align-items: center;

          i {
            position: absolute;

            &.fa-plus {
              top: -10px;
              right: 3px;
              font-size: 0.5rem;
              background: black;
              color: var(--color-text-light-highlight);
              padding: 1px;
              border-radius: 4px;
            }  
          }
        }
      }

      .fcb-header-group-type {
        flex: 1;
        height: var(--form-field-height);

        #fcb-group-by-type {
          flex: 0;
        }
      }
    }
  }

  // the nested tree structure
  // https://www.youtube.com/watch?v=rvKCsHS590o&t=1755s has a nice overview of how this is assembled

  ul.fcb-directory-tree > li:after, ul.fcb-directory-tree > li:before {
    display:none;
  }

</style>