<template>
  <!-- The overall directory sidebar -->
  <section id="fwb-directory" 
    class="tab flexcol journal-directory" 
  >
    <!-- Directory Header -->
    <header class="directory-header">
      <div class="header-search flexrow">
        <input id="fwb-directory-search" type="search" name="search" value="" placeholder="INSERT PLACEHOLDER" autocomplete="off" />
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
        <li v-for="world in worlds"
          :class="'fwb-world-folder folder flexcol ' + (props.worldFolderId===world.id ? '' : 'collapsed')" 
          @click="onWorldFolderClick($event, world.id)"
        >
        <header class="folder-header flexrow">
            <h3 class="noborder"><i class="fas fa-folder-open fa-fw"></i>{{world.name}}</h3>
          </header>

          <!-- These are the topic compendia -->
          <ol v-if="props.worldFolderId===world.id"
            class="world-contents"
          >
            <li v-for="compendium in world.compendia"
              :class="'fwb-topic-folder folder entry flexcol ' + (compendium.collapsed ? 'collapsed' : '')" 
              @click="onTopicFolderClick($event, compendium.id, compendium.topic)"
            >
              <header class="folder-header flexrow">
                <h4 class="noborder" style="margin-bottom:0px">
                  <i class="fas fa-folder-open fa-fw" style="margin-right: 4px;"></i>
                  <i class="icon fas {{icon}}" style="margin-right: 4px;"></i>
                  {{compendium.name}}
                </h4>
                <a 
                  class="fwb-create-entry create-button"
                  @click="onCreateEntryClick($event, compendium.topic, world.id)"
                >
                  <i class="fas fa-atlas"></i>
                  <i class="fas fa-plus"></i>
                </a>
              </header>

              <!-- css will hide this section if the .fwb-topic-folder is collapsed -->
              <ol class="fwb-topic-contents">
                <!-- These are the journal entries -->
                <li v-for="entry in entries"
                  class="fwb-entry-item flexrow" 
                  @click="onEntryClick($event, entry.uuid)"
                >
                    <h4 class="entry-name"><a>{{entry.name}}</a></h4>
                </li>
              </ol>
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
  import { ref, computed, watch, toRaw } from 'vue';
  import { getGame, localize } from '@/utils/game';
  import { createEntry, createWorldFolder } from '@/compendia';
  import { Topic } from '@/types';
  import { getIcon, toTopic } from '@/utils/misc';

  // local imports

  // library components

  // local components

  // types
  type World = {
    compendia: { 
      name: string, 
      id: string,
      topic: Topic,
      icon: string,
      entries: { name: string, uuid: string },
    }[]
  };


  ////////////////////////////////
  // props
  const props = defineProps({
    rootFolder: {
      type: Folder,
      required: true,
    },
    worldFolderId: {    // uuid of current world folder
      type: String,
      required: true
    },
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'worldSelected', worldId: string): void,
    (e: 'entrySelected', entryId: string, ctrlKey: boolean): void,
    (e: 'entryCreated', entryId: string): void,
  }>();

  ////////////////////////////////
  // store

  ////////////////////////////////
  // data
  const expandedCompendia = ref<Record<string, boolean>>({});  // basically a list of compendium uuid that are expanded (collapsed by default); if false or not in here, it's expanded
  
  ////////////////////////////////
  // computed data
  const worlds = computed(() => {
    return (
    (toRaw(props.rootFolder) as Folder)?.children?.map((world)=> ({
      name: world.folder.name,
      id: world.folder.uuid,
      compendia: world.entries.map((compendium)=>({
        name: compendium.metadata.label,
        id: compendium.metadata.id,
        topic: compendium.config.topic,
        icon: getIcon(compendium.config.topic),
        collapsed: !expandedCompendia.value[compendium.metadata.id],
        entries: compendium.tree?.entries?.map((entry)=> ({
          name: entry.name,
          uuid: entry.uuid,
        })) || [],
      })),
    })) || []
  )});

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // change world
  const onWorldFolderClick = async (event: JQuery.ClickEvent, worldId: string) => {
    event.stopPropagation();

    // re-collapse everything
    expandedCompendia.value = {};

    if (worldId)
      emit('worldSelected', worldId);
  };

  // open/close a topic
  const onTopicFolderClick = (event: JQuery.ClickEvent, compendiumId: string) => { 
    event.stopPropagation();

    // toggle the collapse      
    expandedCompendia[compendiumId] = !expandedCompendia[compendiumId];

    // we use css to handle the display update
    // note: we don't do this for worlds because when you change worlds the whole app needs to be refreshed anyways
    jQuery(event.currentTarget).toggleClass('collapsed');
  };

  // close all topics
  const onCollapseAllClick = (event: JQuery.ClickEvent) => {
    event.stopPropagation();

    expandedCompendia.value = {};
    jQuery('.fwb-topic-folder').addClass('collapsed');
  };

  // create a world
  const onCreateWorldClick = async (event: JQuery.ClickEvent) => {
    event.stopPropagation();

    const world = await createWorldFolder(true);
    if (world) {
      emit('worldSelected', world.uuid);
    }
  }

  // select an entry
  const onEntryClick = async (event: JQuery.ClickEvent, entryId: string) => {
    event.stopPropagation();

    emit('entrySelected', entryId, event.ctrlKey);
  }

  // create entry buttons
  const onCreateEntryClick = async (event: JQuery.ClickEvent, compendiumTopic: string, worldId: string) => {
    event.stopPropagation();

    // look for nearest parent and get topic and folder
    const topic = toTopic(compendiumTopic);
    const worldFolder = getGame().folders?.find((f)=>f.uuid===worldId) as Folder;

    if (!worldFolder || !topic)
      throw new Error('Invalid header in .fwb-crate-entry.click()');

    const entry = await createEntry(worldFolder, topic);

    if (entry)
      emit('entryCreated', entry.uuid);
  }
    

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
          border: 1px solid var(--mej-sidebar-input-border);
          background: var(--mej-sidebar-input-background);

          &:hover,
          &:focus,
          &:active {
            background: var(--mej-sidebar-input-background-focus);
          }
    
          &::placeholder {
            color: var(--mej-sidebar-input-placeholder-color);
          }
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

    li.journalentry {
      line-height: 32px;
      border-top: 1px solid var(--mej-sidebar-document-border-top);
      border-bottom: 1px solid var(--mej-sidebar-document-border-botom);
      color: var(--mej-sidebar-document-color);
    }

    .directory.sidebar-tab .fwb-world-list .entry.selected {
      background: rgba(0, 0, 0, 0.03);
    }

    .directory.sidebar-tab .fwb-world-list .entry.selected h4 {
      font-weight: bold;
    }    

    li.journalentry:not(.folder) .entry-name {
      margin: 0 0.25em;
    }

    li.journalentry .entry-name {
      flex-wrap: nowrap;
      align-items: center;
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
    }
  }

  #journal li.journalentry .entry-name {
    flex-wrap: nowrap;
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
  }
</style>