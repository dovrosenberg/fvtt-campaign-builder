<template>
  <div v-if="isTreeRefreshing">
    <ProgressSpinner v-if="isTreeRefreshing" />
  </div>
  <div v-else class="fwb-campaign-list-wrapper">
    <!-- these are the campaigns -->
    <ol class="fwb-campaign-list">
      <li 
        v-for="campaign in directoryStore.currentCampaignTree.value"
        :key="campaign.id"
        :class="'fwb-campaign-folder folder flexcol ' + (campaign.expanded ? '' : 'collapsed')" 
        @click="onCampaignFolderClick($event, campaign.id)"
      >
        <header 
          class="folder-header flexrow"
          @contextmenu="onCampaignContextMenu($event, campaign.id)"
        >
          <h3 class="noborder">
            <i class="fas fa-folder-open fa-fw"></i>
            {{ campaign.name }}
          </h3>
        </header>

        <!-- These are the sessions -->
        <ol 
          v-if="campaign.expanded"
          class="campaign-contents"
        >
          <!-- data-topic-id is used by drag and drop and toggleEntry-->
          <li 
            v-for="topic in campaign.topics.sort((a, b) => (a.topic < b.topic ? -1 : 1))"
            :key="topic.topic"
            :class="'fwb-topic-folder folder entry flexcol fwb-directory-compendium ' + (topic.expanded ? '' : 'collapsed')"
            :data-topic="topic.topic" 
          >
            <header class="folder-header flexrow">
              <div 
                class="fwb-compendium-label noborder" 
                style="margin-bottom:0px"
                @click="onTopicFolderClick($event, topic)"
                @contextmenu="onTopicContextMenu($event, campaign.id, topic.topic)"
              >
                <i class="fas fa-folder-open fa-fw" style="margin-right: 4px;"></i>
                <i :class="'icon fas ' + getIcon(topic.topic)" style="margin-right: 4px;"></i>
                {{ topic.name }}
              </div>
            </header>

            <TopicDirectoryGroupedTree
              :topic="topic"
              :campaign-id="campaign.id"
            />
          </li>
        </ol>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { ref, } from 'vue';
  import { storeToRefs } from 'pinia';
  import ProgressSpinner from 'primevue/progressspinner';

  // local imports
  import { getGame, localize } from '@/utils/game';
  import { getIcon, } from '@/utils/misc';
  import { useDirectoryStore, useMainStore, useNavigationStore, useCurrentEntryStore } from '@/applications/stores';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components
  import SessionDirectoryNode from './SessionDirectoryNode.vue';
  
  // types
  import { DirectoryTopicNode, Topic, } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const directoryStore = useDirectoryStore();
  const currentEntryStore = useCurrentEntryStore();
  const { filterText, isTreeRefreshing, isGroupedByType } = storeToRefs(directoryStore);

  ////////////////////////////////
  // data
  const root = ref<HTMLElement>();
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // change campaign
  const onCampaignFolderClick = async (event: MouseEvent, campaignId: string) => {
    event.stopPropagation();

    if (campaignId)
      await mainStore.setNewCampaign(campaignId);
  };

  const onCampaignContextMenu = (event: MouseEvent, campaignId: string | null): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fwb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('fwb.contextMenus.campaignFolder.delete'), 
          onClick: async () => {
            if (campaignId)
              await directoryStore.deleteCampaign(campaignId);
          }
        },
      ]
    });
  };

  const onTopicContextMenu = (event: MouseEvent, campaignId: string, topic: Topic): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fwb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-atlas',
          iconFontClass: 'fas',
          label: localize(`fwb.contextMenus.topicFolder.create.${topic}`), 
          onClick: async () => {
            // get the right folder
            const campaignFolder = getGame().folders?.find((f)=>f.uuid===campaignId) as globalThis.Folder;

            if (!campaignFolder || !topic)
              throw new Error('Invalid header in CampaignDirectory.onTopicContextMenu.onClick');

            const entry = await currentEntryStore.createEntry(campaignFolder, topic, {} );

            if (entry) {
              await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
      ]
    });
  };

  // open/close a topic
  const onTopicFolderClick = async (event: MouseEvent, directoryTopic: DirectoryTopicNode) => { 
    event.stopPropagation();

    await directoryStore.toggleTopic(directoryTopic);
  };

  // close all topics
  const onCollapseAllClick = (event: MouseEvent) => {
    event.stopPropagation();

    void directoryStore.collapseAll();
  };

  // create a campaign
  const onCreateCampaignClick = async (event: MouseEvent) => {
    event.stopPropagation();

    // // add 400 entries
    // const wf = getGame().folders?.find((f)=>f.id==='IAAEn25ebbVZXL9V');
    // if (wf) {
    //   for (let i=0; i<400; i++) {
    //     await currentEntryStore.createEntry(wf, Topic.Location, { name: foundry.utils.randomID() });
    //   }
    // }

    await directoryStore.createCampaign();
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

    // the campaign list section
    .fwb-campaign-list-wrapper {
      display: flex;
      flex: 0 1 100%;
      overflow: hidden;

      .fwb-campaign-list {
        padding: 0;
        flex-grow: 1;
        overflow: auto;

        .fwb-campaign-folder {
          align-items: flex-start;
          justify-content: flex-start;

          &.active {
            background: #cfcdc2;
          }
        }
      }

      .fwb-campaign-folder > .folder-header {
        border-bottom: none;
        width: 100%;
        flex: 1;

        h3 {
          color: inherit;   // reset the default from foundry            
          text-shadow: inherit;
        }
      }

      .fwb-campaign-folder:not(.collapsed) > .folder-header {
        border-top: 1px solid var(--fwb-sidebar-campaign-border);
        background: var(--fwb-sidebar-campaign-background);
        color: var(--fwb-sidebar-campaign-color);
      }

      .fwb-campaign-folder.collapsed > .folder-header {
        border-top: 1px solid var(--fwb-sidebar-campaign-border-collapsed);
        background: var(--fwb-sidebar-campaign-background-collapsed);
        color: var(--fwb-sidebar-campaign-color-collapsed);
        text-shadow: none;
      }

      .fwb-campaign-folder .folder-header.context {
        border-top: 1px solid var(--mej-active-color);
        border-bottom: 1px solid var(--mej-active-color);
      }

      .fwb-topic-folder .folder-header {
        background: inherit;
        border: 0px;
        text-shadow: none;   // override foundry default
        cursor: pointer;

        i.icon {
          color: #777;
        }  
      }

      // change icon to closed when collapsed
      .fwb-topic-folder.collapsed > .folder-header i.fa-folder-open:before {
        content: "\f07b";
      }

      .fwb-create-entry.create-button {
        i.fa-atlas {
          color: var(--fwb-sidebar-create-entry-color);
        }
        i.fa-plus {
          background: var(--fwb-sidebar-create-entry-secondary-color);
        }
      }

      .campaign-contents {
        border-left: 6px solid var(--fwb-sidebar-subfolder-border);
        border-bottom: 2px solid var(--fwb-sidebar-subfolder-border);
        margin: 0px;
        width: 100%;
        padding-left: 10px;

        .fwb-topic-folder.collapsed .fwb-topic-contents {
          display: none;
        }

        .fwb-topic-contents {
          padding-left: 20px;
          margin: 0px;
        }
      }    
    }
  }

  // #journal li.fwb-entry-item .fwb-entry-name, #journal li.fwb-type-item .fwb-entry-name {
  //   flex-wrap: nowrap;
  //   align-items: center;
  //   display: flex;
  //   flex-direction: row;
  //   justify-content: flex-start;
  // }

  // the nested tree structure
  // https://www.youtube.com/watch?v=rvKCsHS590o&t=1755s has a nice overview of how this is assembled

  .fwb-directory-compendium {
    .fwb-entry-item, .fwb-type-item {
      position: relative;
      padding-left: 1em;
      cursor: pointer;
    }

    // bold the active one
    .fwb-current-directory-entry {
      font-weight: bold;
    }

    ul {
      list-style: none;
      line-height: 2em;   // this makes the horizontal lines centered (when combined with the height on the li::before

      li {
        position: relative;
        padding: 0;
        margin: -0.5em 0 0 0;

        font-family: 'Signika', sans-serif;
        font-size: var(--font-size-14);
        font-weight: normal;

        // this draws the top-half ot the vertical plus the horizontal tree connector lines
        &::before {
          top: 0px;
          border-bottom: 2px solid gray;
          height: 1em;   // controls vertical position of horizontal lines
        }

        // extends the vertical lines down
        &::after {
          bottom: 0px;
          height: 100%;
        }

        &::before, &::after {
          content: "";
          position: absolute;
          left: -10px;   // pushes them left of the text
          border-left: 2px solid gray;
          width: 10px;   // controls the length of the horizontal lines
        }

        &:last-child::after {
          display: none;   // avoid a little tail at the bottom of the vertical lines
        }
      }

      // add the little open markers
      div.summary .fwb-directory-expand-button {
        position: absolute;
        text-align: center;
        line-height: 0.80em;
        color: black;
        background: #777;
        display: block;
        width: 15px;
        height: 15px;
        border-radius: 50em;
        left: -1.2em;
        top: 0.5em;
        z-index: 999;
      }

      div.summary.top .fwb-directory-expand-button {
        margin-left: 1em;
      }

      div.details {
        padding-left: 0.5em;
      }
    }

    // move the text away from the end of the horizontal lines
    li {
      padding-left: 3px;
    }

    // the top level
    & > ul {
      div.summary {
        list-style: none; 

        &::marker, &::-webkit-details-marker {
          display: none !important;
        }
      }

    }
  }

  ul.fwb-directory-tree > li:after, ul.fwb-directory-tree > li:before {
    display:none;
  }

</style>