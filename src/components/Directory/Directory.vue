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
        <q-input 
          v-model="filterText"
          for="fwb-directory-search" 
          debounce="300"
          :bottom-slots="false"
          :placeholder="localize('fwb.placeholders.search')"                
          input-class="full-height"
          autocomplete="off" 
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

    <div v-if="isTreeRefreshing">
      <q-inner-loading :showing="isTreeRefreshing" /> 
    </div>
    <div v-else class="fwb-world-list-wrapper">
      <!-- these are the worlds -->
      <ol class="fwb-world-list">
        <li 
          v-for="world in directoryStore.currentTree.value"
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
            class="world-contents"
          >
            <!-- data-pack-id is used by drag and drop and toggleEntry-->
            <li 
              v-for="pack in world.packs.sort((a, b) => (a.topic < b.topic ? -1 : 1))"
              :key="pack.id"
              :class="'fwb-topic-folder folder entry flexcol fwb-directory-compendium ' + (pack.expanded ? '' : 'collapsed')"
              :data-pack-id="pack.id" 
            >
              <header class="folder-header flexrow">
                <div 
                  class="fwb-compendium-label noborder" 
                  style="margin-bottom:0px"
                  @click="onTopicFolderClick($event, pack)"
                  @contextmenu="onTopicContextMenu($event, world.id, pack.topic)"
                >
                  <i class="fas fa-folder-open fa-fw" style="margin-right: 4px;"></i>
                  <i :class="'icon fas ' + getIcon(pack.topic)" style="margin-right: 4px;"></i>
                  {{ pack.name }}
                </div>
              </header>

              <DirectoryGroupedTree
                v-if="isGroupedByType" 
                :pack="pack"
                :world-id="world.id"
              />
              <DirectoryNestedTree
                v-else 
                :pack="pack"
                :world-id="world.id"
              />
            </li>
          </ol>
        </li>
      </ol>
    </div>
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

  // local imports
  import { getGame, localize } from '@/utils/game';
  import { getIcon, } from '@/utils/misc';
  import { useDirectoryStore, useMainStore, useNavigationStore, useEntryStore } from '@/applications/stores';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';

  // local components
  import DirectoryNestedTree from './DirectoryNestedTree.vue';
  import DirectoryGroupedTree from './DirectoryGroupedTree.vue';
  
  // types
  import { DirectoryPack, Topic, } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const directoryStore = useDirectoryStore();
  const entryStore = useEntryStore();
  const { currentWorldId } = storeToRefs(mainStore);
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
            if (worldId)
              await directoryStore.deleteWorld(worldId);
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
            const worldFolder = getGame().folders?.find((f)=>f.uuid===worldId) as globalThis.Folder;

            if (!worldFolder || !topic)
              throw new Error('Invalid header in Directory.onTopicContextMenu.onClick');

            const entry = await entryStore.createEntry(worldFolder, topic, {} );

            if (entry) {
              await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
      ]
    });
  };

  // open/close a topic
  const onTopicFolderClick = async (event: MouseEvent, directoryPack: DirectoryPack) => { 
    event.stopPropagation();

    await directoryStore.togglePack(directoryPack);
  };

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
    //     await entryStore.createEntry(wf, Topic.Location, { name: foundry.utils.randomID() });
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

    // the world list section
    .fwb-world-list-wrapper {
      display: flex;
      flex: 0 1 100%;
      overflow: hidden;

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

      .world-contents {
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

    .directory.sidebar-tab .fwb-world-list .entry.selected {
      background: rgba(0, 0, 0, 0.03);
    }

    .directory.sidebar-tab .fwb-world-list .entry.selected h4 {
      font-weight: bold;
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