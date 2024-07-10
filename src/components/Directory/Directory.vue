<template>
  <!-- The overall directory sidebar -->
  <section 
    id="fwb-directory" 
    ref="root"
    class="tab flexcol journal-directory" 
  >
    <!-- Directory Header -->
    <header class="directory-header">
      <div class="header-search flexrow">
        <input 
          id="fwb-directory-search" 
          type="search" 
          name="search" 
          value="" 
          :placeholder="localize('fwb.placeholders.search')" 
          autocomplete="off" 
        >
        <a 
          class="header-control create-world create-button" 
          data-tooltip="INSERT TOOLTOP"
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
    </header>

    <!-- these are the worlds -->
    <ol class="fwb-world-list">
      <li 
        v-for="world in currentTree"
        :key="world.id"
        :class="'fwb-world-folder folder flexcol ' + (currentWorldId===world.id ? '' : 'collapsed')" 
        @click="onWorldFolderClick($event, world.id)"
      >
        <header class="folder-header flexrow">
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
          <!-- data-pack-id is used by drag and drop-->
          <li 
            v-for="pack in world.packs"
            :key="pack.id"
            :class="'fwb-topic-folder folder entry flexcol fwb-directory-compendium ' + (pack.expanded ? '' : 'collapsed')"
            :data-pack-id="pack.id" 
            @click="onTopicFolderClick($event, pack)"
          >
            <header class="folder-header flexrow">
              <div class="fwb-compendium-label noborder" style="margin-bottom:0px">
                <i class="fas fa-folder-open fa-fw" style="margin-right: 4px;"></i>
                <i :class="'icon fas ' + getIcon(pack.topic)" style="margin-right: 4px;"></i>
                {{ pack.name }}
              </div>
              <a 
                class="fwb-create-entry create-button"
                @click="onCreateEntryClick($event, pack.topic, world.id)"
              >
                <i class="fas fa-atlas"></i>
                <i class="fas fa-plus"></i>
              </a>
            </header>

            <ul class="fwb-directory-tree">
              <NodeComponent 
                v-for="node in pack.loadedTopNodes"
                :key="node.id"
                :node="node" 
                :expanded="node.expanded" 
                :top="true"
                class="fwb-entry-item" 
                draggable="true"
              />
            </ul>
          </li>
        </ol>
      </li>
    </ol>

    <!-- Directory Footer -->
    <!--
      <footer class="directory-footer action-buttons {{#if data.unavailable}}warning{{/if}}">
        {{~#if data.unavailable}}
          <i class="fa-solid fa-triangle-exclamation"></i>
          <a class="show-issues">{{localize "SUPPORT.UnavailableDocuments" count=data.unavailable document=data.label}}</a>
        {{/if~}}
      </footer>
    -->
  </section>
</template>

<script setup lang="ts">
  // library imports
  import { onMounted, ref, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getGame, localize } from '@/utils/game';
  import { getIcon, toTopic } from '@/utils/misc';
  import { useDirectoryStore, useMainStore, useNavigationStore } from '@/applications/stores';

  // library components

  // local components
  import NodeComponent from './DirectoryNode.vue';

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
  const { currentWorldId } = storeToRefs(mainStore);
  const { currentTree } = storeToRefs(directoryStore);

  ////////////////////////////////
  // data
  const root = ref<HTMLElement>();
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const createContextMenus = function() {
    if (!root.value)
      return;

    // worlds 
    new ContextMenu($(root.value), '.fwb-world-folder', [
      {
        name: 'fwb.contextMenus.worldFolder.delete',
        icon: '<i class="fas fa-trash"></i>',
        callback: async (li) => {
          await directoryStore.deleteWorld(li[0].dataset.worldId);
        }
      },
      // {
      //   name: 'fwb.contextMenus.bookmarks.delete',
      //   icon: '<i class="fas fa-trash"></i>',
      //   callback: async (li) => {
      //     const bookmark = bookmarks.value.find(b => b.id === li[0].dataset.bookmarkId);
      //     if (bookmark)
      //       await removeBookmark(bookmark.id);
      //   }
      // }
    ]).bind();
    
  };

  ////////////////////////////////
  // event handlers

  // change world
  const onWorldFolderClick = async (event: MouseEvent, worldId: string) => {
    event.stopPropagation();

    if (worldId)
      await mainStore.setNewWorld(worldId);
  };

  // open/close a topic
  const onTopicFolderClick = async (event: MouseEvent, directoryPack: DirectoryPack) => { 
    event.stopPropagation();

    await directoryStore.togglePack(directoryPack);

    // toggle the collapse      
    // expandedCompendia[compendiumId] = !expandedCompendia[compendiumId];

    // we use css to handle the display update
    // note: we don't do this for worlds because when you change worlds the whole app needs to be refreshed anyways
    // $(event.currentTarget).toggleClass('collapsed');
  };

  // close all topics
  const onCollapseAllClick = (event: MouseEvent) => {
    event.stopPropagation();

    void directoryStore.collapseAll();
  };

  // create a world
  const onCreateWorldClick = async (event: MouseEvent) => {
    event.stopPropagation();

    await directoryStore.createWorld();
  };

  // create entry buttons
  const onCreateEntryClick = async (event: MouseEvent, compendiumTopic: Topic, worldId: string) => {
    event.stopPropagation();

    // get the right folder
    const topic = toTopic(compendiumTopic);
    const worldFolder = getGame().folders?.find((f)=>f.uuid===worldId) as Folder;

    if (!worldFolder || !topic)
      throw new Error('Invalid header in Directory.onCreateEntryClick');

    const entry = await directoryStore.createEntry(worldFolder, topic);

    if (entry) {
      await navigationStore.openEntry(entry.uuid, { newTab: true, activate: true }); 
    }
  };
    
  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events
  onMounted(() => {
    createContextMenus();
  });

</script>

<style lang="scss">
  #fwb-directory {
    .action-buttons {
      padding-left: 30px;
    }

    .directory-header {
      flex: 0;
      background-color: var(--mej-header-background);
      border-bottom: 1px solid var(--mej-header-border-color);
      color: var(--mej-sidebar-label-color);
      margin-bottom: 0px;
      padding-top: 3px;
      padding-bottom: 6px;
      padding-left: 20px;

      .header-actions.action-buttons button {
        line-height: 24px;
        background: var(--mej-sidebar-button-background);
        border: 2px groove var(--mej-sidebar-button-border);
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
    }

    .fwb-world-list {
      padding: 0;

      .fwb-world-folder {
        align-items: flex-start;
        justify-content: flex-start;

        &.active {
          background: #cfcdc2;
        }
      }
    }

    .fwb-world-folder > .folder-header {
      border-top: 1px solid var(--mej-sidebar-folder-border-collapsed);
      border-bottom: none;
      width: 100%;
      background: var(--mej-sidebar-folder-background-collapsed);
      flex: 1;
      color: var(--color-text-light-highlight);
    }

    .fwb-world-folder:not(.collapsed) > .folder-header {
      border-top: 1px solid var(--mej-sidebar-folder-border);
      background: var(--mej-sidebar-folder-background);
    }

    .fwb-world-folder.collapsed > .folder-header:not(.customcolor) {
      color: var(--mej-sidebar-folder-color-collapsed);
    }

    .fwb-world-folder .folder-header.context {
      border-top: 1px solid var(--mej-active-color);
      border-bottom: 1px solid var(--mej-active-color);
    }

    .fwb-world-folder .folder-header.context,
    .fwb-world-folder .folder-header.context h3 {
      color: var(--mej-sidebar-folder-context-color);
    }

    .fwb-topic-folder .folder-header {
      background: inherit;
      border: 0px;

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
        color: #555;
      }
      i.fa-plus {
        background: #555;
      }
    }

    .world-contents {
      border-left: 6px solid var(--mej-sidebar-subfolder-border);
      border-bottom: 2px solid var(--mej-sidebar-subfolder-border);
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

    .directory.sidebar-tab .fwb-world-list .entry.selected {
      background: rgba(0, 0, 0, 0.03);
    }

    .directory.sidebar-tab .fwb-world-list .entry.selected h4 {
      font-weight: bold;
    }    
  }

  #journal li.fwb-entry-item .fwb-entry-name {
    flex-wrap: nowrap;
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
  }

  // the nested tree structure
  // https://www.youtube.com/watch?v=rvKCsHS590o&t=1755s has a nice overview of how this is assembled

  .fwb-directory-compendium {
    .fwb-entry-item {
      position: relative;
      padding-left: 1em;
      cursor: pointer;
    }

    // very first node
    ul.top-node > li {
      &::before, &::after {
        display:none;   // hide bar on the main level
      }
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
          position: absolute;
          left: -10px;   // pushes them left of the text
          border-left: 2px solid gray;
          content: "";
          width: 10px;   // controls the length of the horizontal lines
        }

        &:last-child::after {
          display: none;   // avoid a little tail at the bottom of the vertical lines
        }
      }

      // add the little open markers
      summary::before {
        position: absolute;
        content: "+";
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

      details[open] summary::before {
        content: "-";
      }

      summary.top::before {
        margin-left: 1em;
      }

      details {
        padding-left: 0.5em;
      }
    }

    // move the text away from the end of the horizontal lines
    li {
      padding-left: 3px;
    }

    // the top level
    & > ul {
      summary {
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