<template>
  <!-- The overall directory sidebar -->
  <div 
    id="fwb-directory" 
    ref="root"
    class="tab flexcol journal-directory" 
  >
    <!-- Directory Header -->
    <header class="directory-header">
      <div class="header-search flexrow">
        <InputText 
          v-model="filterText"
          for="fwb-directory-search" 
          :placeholder="localize('fwb.placeholders.search')"                
          autocomplete="off"
          :pt="{
            root: {
              class: 'full-height',
            }
          }"
        />
        <a 
          class="header-control create-world create-button" 
          :data-tooltip="localize('fwb.tooltips.createWorld')"
          @click="onCreateWorldClick"
        >
          <i class="fas fa-globe"></i>
          <i class="fas fa-plus"></i>
        </a>
        <a 
          class="header-control collapse-all" 
          :data-tooltip="localize('fwb.tooltips.collapseAllTopics')"
          @click="onCollapseAllClick"
        >
          <i class="fa-duotone fa-folder-tree"></i>
        </a>
      </div>
      <div class="header-group-type flexrow">
        <input
          id="fwb-group-by-type"
          type="checkbox"
          :checked="isGroupedByType"
          @change="onGroupTypeChange"
        >
        <label for="fwb-group-by-type">
          {{ localize('fwb.labels.groupTree') }}
        </label>
      </div>
    </header>

    <Splitter layout="vertical" class="fwb-directory-spliter">
      <SplitterPanel :size="60" class="fwb-directory-panel"> 
        <div v-if="isTopicTreeRefreshing">
          <ProgressSpinner v-if="isTopicTreeRefreshing" />
        </div>
        <div v-else class="fwb-directory-panel-wrapper">
          <TopicDirectory />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="40" class="fwb-directory-panel"> 
        <div class="fwb-directory-panel-wrapper">
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
  const directoryStore = useTopicDirectoryStore();
  const { filterText, isTopicTreeRefreshing, isGroupedByType } = storeToRefs(directoryStore);

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

    void directoryStore.collapseAll();
  };

  // create a world
  const onCreateWorldClick = async (event: MouseEvent) => {
    event.stopPropagation();

    // // add 400 entries
    // const wf = getGame().folders?.find((f)=>f.id==='IAAEn25ebbVZXL9V');
    // if (wf) {
    //   for (let i=0; i<400; i++) {
    //     await currentEntryStore.createEntry(wf, Topic.Location, { name: foundry.utils.randomID() });
    //   }
    // }

    await directoryStore.createWorld();
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
  #fwb-directory {
    .action-buttons {
      padding-left: 30px;
    }

    .fwb-directory-spliter {
      flex: 1 1 auto;  // take up all remaining space
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .fwb-directory-panel-wrapper {
        flex: 1;
        overflow-y: auto;
        height: 100%;
      } 

      .fwb-directory-panel {
        display: flex;
        flex-direction: column;
        overflow: hidden; 
        height: 100%; 
      }

      .directory-header {
        flex: 0;
        background-color: var(--fwb-header-background);
        border-bottom: 1px solid var(--fwb-header-border-color);
        color: var(--fwb-sidebar-label-color);
        margin-bottom: 0px;
        padding-top: 3px;
        padding-bottom: 6px;
        padding-left: 20px;

        .header-actions.action-buttons button {
          line-height: 24px;
          background: var(--fwb-sidebar-button-background);
          border: 2px groove var(--fwb-sidebar-button-border);
        }

        .header-search {
          #fwb-directory-search {
            flex: 1;
            height: var(--form-field-height);
          }

          .header-control {
            flex: 0 0 32px;
            text-align: center;
            position: relative;

            i {
              position: absolute;

              &.fa-plus {
                top: -2px;
                right: -2px;
                font-size: 0.5rem;
                background: black;
                color: var(--color-text-light-highlight);
                padding: 1px;
                border-radius: 4px;
              }  
            }
          }
        }

        .header-group-type {
          flex: 1;
          height: var(--form-field-height);

          #fwb-group-by-type {
            flex: 0;
          }
        }
      }
    }
  }

  // the nested tree structure
  // https://www.youtube.com/watch?v=rvKCsHS590o&t=1755s has a nice overview of how this is assembled

  ul.fwb-directory-tree > li:after, ul.fwb-directory-tree > li:before {
    display:none;
  }

</style>