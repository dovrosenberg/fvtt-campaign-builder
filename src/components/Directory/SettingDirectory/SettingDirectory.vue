<template>
  <!-- these are the settings (well, really just one) -->
  <ol 
    class="fcb-setting-list"
    @drop="onDropActor"
    @dragover="DragDropService.standardDragover"
  >
    <li
      v-if="currentSettingTreeObject"
      :key="currentSettingTreeObject.id"
      class="fcb-setting-folder folder flexcol"
    >
      <header
        class="folder-header flexrow"
        :class="`folder-header flexrow ${isCurrentSettingActive ? 'active' : ''}`"
        :data-testid="`setting-folder-${currentSettingTreeObject.name}`"
        @contextmenu="onSettingContextMenu($event, currentSettingTreeObject.id)"
        @click="onSettingFolderClick($event, currentSettingTreeObject.id)"
        draggable="true"
        @dragstart="onDragstart($event, currentSettingTreeObject.id, currentSettingTreeObject.name)"
      >
        <div class="noborder">
          <i class="fas fa-folder-open fa-fw"></i>
          {{ currentSettingTreeObject.name }}
        </div>
      </header>

      <!-- These are the topic compendia -->
      <ol 
        class="fcb-setting-contents"
      >
        <!-- data-topic-id is used by drag and drop and toggleEntry-->
        <li 
          v-for="topicNode in currentSettingTreeObject.topicNodes.sort((a, b) => (a.topicFolder.topic < b.topicFolder.topic ? -1 : 1))"
          :key="topicNode.topicFolder.topic"
          :class="'fcb-topic-folder folder entry flexcol ' + (topicNode.expanded ? '' : 'collapsed')"
          :data-topic="topicNode.topicFolder.topic" 
        >
          <header class="folder-header flexrow">
            <div 
              class="noborder" 
              style="margin-bottom:0px"
              :data-testid="`topic-folder-${topicNode.topicFolder.topic}`"
              @click="onTopicFolderClick($event, topicNode as DirectoryTopicFolderNode)"
              @contextmenu="onTopicContextMenu($event, currentSettingTreeObject.id, topicNode.topicFolder as TopicFolder)"
            >
              <i class="fas fa-folder-open fa-fw" style="margin-right: 4px;"></i>
              <i :class="'icon fas ' + getTopicIcon(topicNode.topicFolder.topic)" style="margin-right: 4px;"></i>
              {{ topicNode.name }}
            </div>
          </header>

          <SettingDirectoryGroupedTree
            v-if="(isGroupedByType && topicNode.topicFolder.topic !== Topics.PC) || topicNode.topicFolder.topic === Topics.Character" 
            :topic-node="topicNode as DirectoryTopicFolderNode"
            :setting-id="currentSettingTreeObject.id"
          />
          <SettingDirectoryNestedTree
            v-else 
            :topic-node="topicNode as DirectoryTopicFolderNode"
            :setting-id="currentSettingTreeObject.id"
          />
        </li>
      </ol>
    </li>
  </ol>
</template>

<script setup lang="ts">
  // library imports
  import { storeToRefs } from 'pinia';
  import { computed, } from 'vue';

  // local imports
  import { localize } from '@/utils/game';
  import { getTopicIcon, getTabTypeIcon } from '@/utils/misc';
  import { useSettingDirectoryStore, useMainStore, useNavigationStore, useCampaignDirectoryStore } from '@/applications/stores';
  import GlobalSettingService from '@/utils/globalSettings';
  import SettingExportService from '@/utils/settingExport';
  import { exportSingleSettingJson } from '@/utils/export';
  import DragDropService from '@/utils/dragDrop';
  
  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import SettingDirectoryNestedTree from './SettingDirectoryNestedTree.vue';
  import SettingDirectoryGroupedTree from './SettingDirectoryGroupedTree.vue';


  // types
  import { WindowTabType, Topics, FoundryDragType } from '@/types';
  import { DirectoryTopicFolderNode, TopicFolder, } from '@/classes';
  import { SettingNodeDragData } from '@/types/dragDrop';
  
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
  const { currentSetting, currentContentType } = storeToRefs(mainStore);
  const { isGroupedByType, currentSettingTree } = storeToRefs(settingDirectoryStore);

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data
  const currentSettingTreeObject = computed(() => {
    return currentSettingTree.value.value.find((setting) => setting.id === currentSetting.value?.uuid) || null;
  });

  // Check if the current setting tab is active
  const isCurrentSettingActive = computed(() => {
    return currentContentType.value === WindowTabType.Setting && currentSetting.value?.uuid === currentSettingTreeObject.value?.id;
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  /**
   * Handles drag start for setting folders.
   * @param event The drag start event
   * @param settingId The UUID of the setting being dragged
   * @param settingName The name of the setting being dragged
   */
  const onDragstart = async (event: DragEvent, settingId: string, settingName: string): Promise<void> => {
    event.stopPropagation();

    // Create the FCB data
    const fcbData = {
      type: 'fcb-setting',
      settingId: settingId,
      name: settingName
    } as SettingNodeDragData;

    // Set combined drag data for both canvas drops and internal operations
    DragDropService.setCombinedDragData(event, settingId, fcbData);
  };

  /**
   * Handles clicking on a setting folder to open its description.
   * @param event The click event
   * @param settingId The UUID of the selected setting
   */
  const onSettingFolderClick = async (event: MouseEvent, settingId: string) => {
    event.preventDefault();
    event.stopPropagation();

    if (settingId) {
      await navigationStore.openSetting(settingId, { newTab: event.ctrlKey, panelIndex: event.altKey ? -1 : undefined });
    }
  };


  /**
   * Handles right-click context menu on a setting folder, offering actions like delete or create campaign.
   * @param event The contextmenu event
   * @param settingId The UUID of the setting
   */
  const onSettingContextMenu = (event: MouseEvent, settingId: string | null): void => {
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
          icon: 'fa-file-alt',
          iconFontClass: 'fas',
          label: 'Export Setting', 
          onClick: async () => {
            if (settingId) {
              await SettingExportService.exportSettingMarkdown(settingId);
            }
          }
        },
        { 
          icon: 'fa-file-archive',
          iconFontClass: 'fas',
          label: 'Export Setting with Story Webs', 
          onClick: async () => {
            if (settingId) {
              await SettingExportService.exportSetting(settingId);
            }
          }
        },
        { 
          icon: 'fa-file-code',
          iconFontClass: 'fas',
          label: localize('contextMenus.settingFolder.exportJson'), 
          onClick: async () => {
            if (settingId) {
              await exportSingleSettingJson(settingId);
            }
          }
        },
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.settingFolder.delete'), 
          onClick: async () => {
            if (settingId) {
              await settingDirectoryStore.deleteSetting(settingId);
              await campaignDirectoryStore.refreshCampaignDirectoryTree();
            }
          }
        },
        { 
          icon: getTabTypeIcon(WindowTabType.Campaign),
          iconFontClass: 'fas',
          label: localize('contextMenus.settingFolder.createCampaign'), 
          onClick: async () => {
            if (settingId) {
              const setting = await GlobalSettingService.getGlobalSetting(settingId);

              if (setting) {
                await campaignDirectoryStore.createCampaign(setting);
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
   * @param settingId The UUID of the parent setting
   * @param topicFolder The TopicFolder object representing the clicked topic
   */
  const onTopicContextMenu = (event: MouseEvent, _settingId: string, topicFolder: TopicFolder): void => {
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
   * @param directoryTopic The DirectoryTopicFolderNode being toggled
   */
  const onTopicFolderClick = async (event: MouseEvent, directoryTopic: DirectoryTopicFolderNode) => { 
    event.stopPropagation();

    await settingDirectoryStore.toggleTopic(directoryTopic);
  };

  /**
   * Handles dropping a Foundry actor onto the setting directory.
   * Creates a new Character entry from the actor and opens it.
   * @param event The drop event
   */
  const onDropActor = async (event: DragEvent): Promise<void> => {
    // Don't handle if another handler already processed this
    if (event.defaultPrevented)
      return;

    event.preventDefault();
    event.stopPropagation();

    // Parse the drag data
    const data = DragDropService.getValidatedData(event) as FoundryDragType | undefined;
    if (!data)
      return;

    // Only handle Actor drops
    if (data.type !== 'Actor' || !data.uuid)
      return;

    // Create the entry from the actor
    const entry = await settingDirectoryStore.createEntryFromActor(data.uuid);

    if (entry) {
      // Open the entry in the currently focused panel
      await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true });
    }
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

  // the setting list section
  .fcb-directory-panel-wrapper {
    font-family: var(--fcb-font-family);

    .fcb-setting-list {
      padding: 0;
      flex-grow: 1;
      margin-top: .1875rem;      

      .fcb-setting-folder {
        align-items: flex-start;
        justify-content: flex-start;
        min-width: 100%;
        width: max-content;
        font-weight: 700;

        & > .folder-header {
          border-bottom: none;
          width: 100%;
          flex: 1;
          cursor: pointer;

          // bold the active one
          &.active {
            color: var(--fcb-accent-400) !important;
            font-weight: bold !important;
          }
        }

        // setting folder styling
        &:not(.collapsed) > .folder-header {
          color: var(--fcb-text);
          background: inherit;
          text-shadow: none;
          position: relative;
        }
      }
    }

    // topic folder styling
    .fcb-topic-folder.collapsed > .folder-header, .fcb-topic-folder:not(.collapsed) > .folder-header {
      background: inherit;  // override foundry default
      border: 0px;
      color: var(--fcb-text);
      text-shadow: none;   // override foundry default
      cursor: pointer;
      position: relative;

      i.icon {
        color: var(--fcb-sidebar-topic-icon-color);
      }  
    }

    // change icon to closed when collapsed
    .fcb-topic-folder.collapsed > .folder-header i.fa-folder-open:before {
      content: "\f07b";
    }

    .fcb-setting-contents {
      margin: 0px;
      /* width: 100%; */
      padding-left: 10px;
    }    
  }

  // the nested tree structure
  // https://www.youtube.com/watch?v=rvKCsHS590o&t=1755s has a nice overview of how this is assembled

  .fcb-topic-folder {
    font-size: var(--fcb-font-size);
    font-family: var(--fcb-font-family);

    .fcb-entry-item, .fcb-type-item {
      position: relative;
      padding-left: 1em;
      cursor: pointer;
    }

    // bold the active one
    .fcb-current-directory-entry, .fcb-current-directory-branch {
      color: var(--fcb-accent-400);
      font-weight: 700;
      cursor: pointer;
    }

    .fcb-directory-entry {
      cursor: pointer;
    }

    ul {
      list-style: none;
      line-height: 2em;   // this makes the horizontal lines centered (when combined with the height on the li::before
      margin-top: 0.25rem;

      li {
        position: relative;
        padding: 0;
        margin: -0.5em 0 0 0;

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
        height: .9375rem;
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
        
        // For simple nodes without children (no ul), add margin-bottom to match the ul margin-top
        &:not(:has(ul)) {
          margin-bottom: 0.25rem;
        }
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