<template>
  <!-- these are the worlds -->
  <ol class="fwb-world-list">
    <li 
      v-for="world in topicDirectoryStore.currentWorldTree.value"
      :key="world.id"
      :class="'fwb-world-folder folder flexcol ' + (currentWorldId===world.id ? '' : 'collapsed')" 
      @click="onWorldFolderClick($event, world.id)"
    >
      <header 
        class="folder-header flexrow"
        @contextmenu="onWorldContextMenu($event, world.id)"
      >
        <h3 class="noborder">
          <i class="fas fa-folder-open fa-fw"></i>
          {{ world.name }}
        </h3>
      </header>

      <!-- These are the topic compendia -->
      <ol 
        v-if="currentWorldId===world.id"
        class="fwb-world-contents"
      >
        <!-- data-topic-id is used by drag and drop and toggleEntry-->
        <li 
          v-for="topic in world.topics.sort((a, b) => (a.topic < b.topic ? -1 : 1))"
          :key="topic.topic"
          :class="'fwb-topic-folder folder entry flexcol fwb-directory-compendium ' + (topic.expanded ? '' : 'collapsed')"
          :data-topic="topic.topic" 
        >
          <header class="folder-header flexrow">
            <div 
              class="fwb-compendium-label noborder" 
              style="margin-bottom:0px"
              @click="onTopicFolderClick($event, topic)"
              @contextmenu="onTopicContextMenu($event, world.id, topic.topic)"
            >
              <i class="fas fa-folder-open fa-fw" style="margin-right: 4px;"></i>
              <i :class="'icon fas ' + getTopicIcon(topic.topic)" style="margin-right: 4px;"></i>
              {{ topic.name }}
            </div>
          </header>

          <TopicDirectoryGroupedTree
            v-if="isGroupedByType" 
            :topic-node="topic"
            :world-id="world.id"
          />
          <TopicDirectoryNestedTree
            v-else 
            :topic="topic"
            :world-id="world.id"
          />
        </li>
      </ol>
    </li>
  </ol>
</template>

<script setup lang="ts">
  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { getTopicIcon, getTabTypeIcon } from '@/utils/misc';
  import { useTopicDirectoryStore, useMainStore, useNavigationStore, useCampaignDirectoryStore } from '@/applications/stores';
  
  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import TopicDirectoryNestedTree from './TopicDirectoryNestedTree.vue';
  import TopicDirectoryGroupedTree from './TopicDirectoryGroupedTree.vue';
  
  // types
  import { Topic, WindowTabType } from '@/types';
  import { DirectoryTopicNode, Campaign, } from '@/classes';
  
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
  const { currentWorldId } = storeToRefs(mainStore);
  const { isGroupedByType } = storeToRefs(topicDirectoryStore);

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // change world
  const onWorldFolderClick = async (event: MouseEvent, worldId: string) => {
    event.stopPropagation();

    if (worldId)
      await mainStore.setNewWorld(worldId);
  };

  const onWorldContextMenu = (event: MouseEvent, worldId: string | null): void => {
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
          label: localize('fwb.contextMenus.worldFolder.delete'), 
          onClick: async () => {
            if (worldId) {
              await topicDirectoryStore.deleteWorld(worldId);
              await campaignDirectoryStore.refreshCampaignDirectoryTree();
            }
          }
        },
        { 
          icon: getTabTypeIcon(WindowTabType.Campaign),
          iconFontClass: 'fas',
          label: localize('fwb.contextMenus.worldFolder.createCampaign'), 
          onClick: async () => {
            if (worldId) {
              await Campaign.create();
              await campaignDirectoryStore.refreshCampaignDirectoryTree();
            }
          }
        },
      ]
    });
  };

  const onTopicContextMenu = (event: MouseEvent, worldId: string, topic: Topic): void => {
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
            const worldFolder = game.folders?.find((f)=>f.uuid===worldId) as globalThis.Folder;

            if (!worldFolder || !topic)
              throw new Error('Invalid header in Directory.onTopicContextMenu.onClick');

            const entry = await topicDirectoryStore.createEntry(topic, {} );

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

    await topicDirectoryStore.toggleTopic(directoryTopic);
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
  }

  // the world list section
  .fwb-directory-panel-wrapper {
    .fwb-world-list {
      padding: 0;
      flex-grow: 1;
      overflow: auto;

      .fwb-world-folder {
        align-items: flex-start;
        justify-content: flex-start;

        &.active {
          background: #cfcdc2;
        }
      }
    }

    .fwb-world-folder > .folder-header {
      border-bottom: none;
      width: 100%;
      flex: 1;

      h3 {
        color: inherit;   // reset the default from foundry            
        text-shadow: inherit;
      }
    }

    // world folder styling
    .fwb-world-folder:not(.collapsed) > .folder-header {
      border-top: 1px solid var(--fwb-sidebar-world-border);
      background: var(--fwb-sidebar-world-background);
      color: var(--fwb-sidebar-world-color);
    }

    .fwb-world-folder.collapsed > .folder-header {
      border-top: 1px solid var(--fwb-sidebar-world-border-collapsed);
      background: var(--fwb-sidebar-world-background-collapsed);
      color: var(--fwb-sidebar-world-color-collapsed);
      text-shadow: none;
    }

    .fwb-world-folder .folder-header.context {
      border-top: 1px solid var(--mej-active-color);
      border-bottom: 1px solid var(--mej-active-color);
    }

    // topic folder styling
    .fwb-topic-folder.collapsed > .folder-header, .fwb-topic-folder:not(.collapsed) > .folder-header {
      background: inherit;  // override foundry default
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

    .fwb-world-contents {
      border-left: 6px solid var(--fwb-sidebar-subfolder-border);
      border-bottom: 2px solid var(--fwb-sidebar-subfolder-border);
      margin: 0px;
      width: 100%;
      padding-left: 10px;
    }    
  }

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