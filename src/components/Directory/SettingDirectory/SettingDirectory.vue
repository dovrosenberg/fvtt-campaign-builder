<template>
  <!-- these are the worlds -->
  <ol class="fcb-world-list">
    <li
      v-for="world in currentWorldTree.value"
      :key="world.id"
      :class="'fcb-world-folder folder flexcol ' + (currentWorld?.uuid===world.id ? '' : 'collapsed')"
      draggable="true"
      @dragstart="onWorldDragStart($event, world)"
    >
      <header
        class="folder-header flexrow"
        @contextmenu="onWorldContextMenu($event, world.id)"
        @click="onWorldFolderClick($event, world.id)"
      >
        <div class="noborder">
          <i :class="`fas ${currentWorld?.uuid===world.id ? 'fa-folder-open' : 'fa-folder'} fa-fw`"></i>
          {{ world.name }}
        </div>
      </header>

      <!-- These are the topic compendia -->
      <ol 
        v-if="currentWorld?.uuid===world.id"
        class="fcb-world-contents"
      >
        <!-- data-topic-id is used by drag and drop and toggleEntry-->
        <li 
          v-for="topicNode in world.topicNodes.sort((a, b) => (a.topicFolder.topic < b.topicFolder.topic ? -1 : 1))"
          :key="topicNode.topicFolder.topic"
          :class="'fcb-topic-folder folder entry flexcol fcb-directory-compendium ' + (topicNode.expanded ? '' : 'collapsed')"
          :data-topic="topicNode.topicFolder.topic" 
        >
          <header class="folder-header flexrow">
            <div 
              class="fcb-compendium-label noborder" 
              style="margin-bottom:0px"
              @click="onTopicFolderClick($event, topicNode as DirectoryTopicNode)"
              @contextmenu="onTopicContextMenu($event, world.id, topicNode.topicFolder as TopicFolder)"
            >
              <i class="fas fa-folder-open fa-fw" style="margin-right: 4px;"></i>
              <i :class="'icon fas ' + getTopicIcon(topicNode.topicFolder.topic)" style="margin-right: 4px;"></i>
              {{ topicNode.name }}
            </div>
          </header>

          <SettingDirectoryGroupedTree
            v-if="isGroupedByType" 
            :topic-node="topicNode as DirectoryTopicNode"
            :world-id="world.id"
          />
          <SettingDirectoryNestedTree
            v-else 
            :topic-node="topicNode as DirectoryTopicNode"
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
  import { ref } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { getTopicIcon, getTabTypeIcon } from '@/utils/misc';
  import { useSettingDirectoryStore, useMainStore, useNavigationStore, useCampaignDirectoryStore } from '@/applications/stores';
  
  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import SettingDirectoryNestedTree from './SettingDirectoryNestedTree.vue';
  import SettingDirectoryGroupedTree from './SettingDirectoryGroupedTree.vue';


  // types
  import { Topics, ValidTopic, WindowTabType, DirectoryWorld } from '@/types';
  import { DirectoryTopicNode, Campaign, Setting, TopicFolder, } from '@/classes';
  
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
  const { currentWorld } = storeToRefs(mainStore);
  const { isGroupedByType, currentWorldTree } = storeToRefs(settingDirectoryStore);

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  /**
   * Handles dragging a world folder.
   * @param event The drag event
   * @param world The world object being dragged
   */
  const onWorldDragStart = (event: DragEvent, world: DirectoryWorld): void => {
    event.stopPropagation();

    const dragData = {
      worldNode: true,
      worldId: world.id,
      name: world.name
    };

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  /**
   * Handles clicking on a world folder to activate it and navigate to it.
   * @param event The click event
   * @param worldId The UUID of the selected world
   */
  const onWorldFolderClick = async (event: MouseEvent, worldId: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (worldId) {
      await mainStore.setNewWorld(worldId);

      // see if there's already a world tab open - if so, switch
      const existingTab = navigationStore.tabs.find(t => t.contentId === worldId);
      if (existingTab) {
        await navigationStore.activateTab(existingTab.id);
        return;
      } else {
        // if not - open one
        await navigationStore.openWorld(worldId, {newTab: true});
      }
    }
  };

  /**
   * Handles right-click context menu on a world folder, offering actions like delete or create campaign.
   * @param event The contextmenu event
   * @param worldId The UUID of the world
   */
  const onWorldContextMenu = (event: MouseEvent, worldId: string | null): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.worldFolder.delete'), 
          onClick: async () => {
            if (worldId) {
              await settingDirectoryStore.deleteWorld(worldId);
              await campaignDirectoryStore.refreshCampaignDirectoryTree();
            }
          }
        },
        { 
          icon: getTabTypeIcon(WindowTabType.Campaign),
          iconFontClass: 'fas',
          label: localize('contextMenus.worldFolder.createCampaign'), 
          onClick: async () => {
            if (worldId) {
              const world = await Setting.fromUuid(worldId);

              if (world) {
                await Campaign.create(world);
                await campaignDirectoryStore.refreshCampaignDirectoryTree();
              }
            }
          }
        },
      ]
    });
  };

  /**
   * Handles right-click context menu on a topic folder, offering actions like creating an entry or generating a character.
   * @param event The contextmenu event
   * @param worldId The UUID of the parent world
   * @param topicFolder The TopicFolder object representing the clicked topic
   */
  const onTopicContextMenu = (event: MouseEvent, _worldId: string, topicFolder: TopicFolder): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: settingDirectoryStore.getTopicContextMenuItems(topicFolder)
    });
  };

 /**
   * Toggles expansion of a topic node when clicked.
   * @param event The click event
   * @param directoryTopic The DirectoryTopicNode being toggled
   */
  const onTopicFolderClick = async (event: MouseEvent, directoryTopic: DirectoryTopicNode) => { 
    event.stopPropagation();

    await settingDirectoryStore.toggleTopic(directoryTopic);
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
  }

  // the world list section
  .fcb-directory-panel-wrapper {
    .fcb-world-list {
      padding: 0;
      flex-grow: 1;
      overflow: auto;
      margin-top: 3px;

      .fcb-world-folder {
        align-items: flex-start;
        justify-content: flex-start;

        &.active {
          background: #cfcdc2;
        }
      }
    }

    .fcb-world-folder > .folder-header {
      border-bottom: none;
      width: 100%;
      flex: 1;
      cursor: pointer;
    }

    // world folder styling
    .fcb-world-folder:not(.collapsed) > .folder-header {
      border-top: 1px solid var(--fcb-sidebar-world-border);
      background: var(--fcb-sidebar-world-background);
      color: var(--fcb-sidebar-world-color);
      text-shadow: none;
    }

    .fcb-world-folder.collapsed > .folder-header {
      cursor: pointer;
      border-top: 1px solid var(--fcb-sidebar-world-border-collapsed);
      background: var(--fcb-sidebar-world-background-collapsed);
      color: var(--fcb-sidebar-world-color-collapsed);
      text-shadow: none;
    }

    .fcb-world-folder .folder-header.context {
      border-top: 1px solid var(--mej-active-color);
      border-bottom: 1px solid var(--mej-active-color);
    }

    // topic folder styling
    .fcb-topic-folder.collapsed > .folder-header, .fcb-topic-folder:not(.collapsed) > .folder-header {
      background: inherit;  // override foundry default
      border: 0px;
      color: var(--fcb-sidebar-world-color);
      text-shadow: none;   // override foundry default
      cursor: pointer;

      i.icon {
        color: var(--fcb-sidebar-topic-icon-color);
      }  
    }

    // change icon to closed when collapsed
    .fcb-topic-folder.collapsed > .folder-header i.fa-folder-open:before {
      content: "\f07b";
    }

    .fcb-world-contents {
      margin: 0px;
      width: 100%;
      padding-left: 10px;
    }    
  }

  // the nested tree structure
  // https://www.youtube.com/watch?v=rvKCsHS590o&t=1755s has a nice overview of how this is assembled

  .fcb-directory-compendium {
    .fcb-entry-item, .fcb-type-item {
      position: relative;
      padding-left: 1em;
      cursor: pointer;
    }

    // bold the active one
    .fcb-current-directory-entry {
      font-weight: bold;
      cursor: pointer;
    }

    .fcb-directory-entry {
      cursor: pointer;
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
      div.summary .fcb-directory-expand-button {
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
        z-index: 1;
      }

      div.summary.top .fcb-directory-expand-button {
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

  ul.fcb-directory-tree > li:after, ul.fcb-directory-tree > li:before {
    display:none;
  }

</style>