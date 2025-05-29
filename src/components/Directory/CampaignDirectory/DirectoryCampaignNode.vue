<template>
  <li
    :class="`fcb-campaign-folder folder entry flexcol fcb-directory-compendium ${props.campaignNode.expanded ? '' : 'collapsed'} ${isActiveCampaign ? 'active' : ''}`"
    :data-campaign="props.campaignNode.id"
    draggable="true"
    @dragstart="onDragStart"
  >
    <header class="folder-header flexrow">
      <div
        class="fcb-compendium-label noborder"
        style="margin-bottom:0px"
        @contextmenu="onCampaignContextMenu"
      >
        <i
          class="fas fa-folder-open fa-fw"
          style="margin-right: 4px;"
          @click="onCampaignFolderClick"
        ></i>
        <span @click="onCampaignSelectClick">
          {{ props.campaignNode.name }}
        </span>
      </div>
    </header>

    <!-- These are the sessions -->
    <ul 
      v-if="props.campaignNode.expanded"
      class="campaign-contents fcb-directory-tree"
    >
      <SessionDirectoryNode 
        v-for="node in sortedChildren"
        :key="node.id"
        :session-node="node"
        :top="true"
        class="fcb-entry-item" 
        draggable="true"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useNavigationStore, useMainStore } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components
  import SessionDirectoryNode from './SessionDirectoryNode.vue';
  
  // types
  import { DirectoryCampaignNode, } from '@/classes';
  import { DirectorySessionNode, WindowTabType } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    campaignNode: {
      type: Object as PropType<DirectoryCampaignNode>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { isInPlayMode, currentCampaign } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  // we don't just use props node because in toggleWithLoad we want to swap it out without rebuilding
  //   the whole tree
  const currentNode = ref<DirectoryCampaignNode>(props.campaignNode);
  
  ////////////////////////////////
  // computed data
  const sortedChildren = computed((): DirectorySessionNode[] => {
    const children = props.campaignNode.loadedChildren;
    return children.sort((a, b) => a.sessionNumber - b.sessionNumber);
  });

  // Check if this campaign is the currently active one
  const isActiveCampaign = computed((): boolean => {
    return currentCampaign.value?.uuid === props.campaignNode.id;
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // handle campaign dragging
  const onDragStart = (event: DragEvent): void => {
    event.stopPropagation();

    const dragData = {
      campaignNode: true,
      campaignId: props.campaignNode.id,
      name: props.campaignNode.name
    };

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  // change campaign
  const onCampaignFolderClick = async (_event: MouseEvent) => {
    currentNode.value = await campaignDirectoryStore.toggleWithLoad(currentNode.value as DirectoryCampaignNode, !currentNode.value.expanded);
  };

  const onCampaignSelectClick = async (event: MouseEvent) => {
    await navigationStore.openCampaign(currentNode.value.id, {newTab: event.ctrlKey});
  };

  const onCampaignContextMenu = (event: MouseEvent): void => {
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
          icon: getTabTypeIcon(WindowTabType.Session),
          iconFontClass: 'fas',
          disabled: isInPlayMode.value,
          label: localize('contextMenus.campaignFolder.createSession'), 
          onClick: async () => {
            const session = await campaignDirectoryStore.createSession(props.campaignNode.id);

            if (session) {
              await navigationStore.openSession(session.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('contextMenus.campaignFolder.delete'), 
          disabled: isInPlayMode.value,
          onClick: async () => {
            await campaignDirectoryStore.deleteCampaign(props.campaignNode.id);
          }
        },
      ]
    });
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
  #fcb-directory {
    // the campaign list section
    .fcb-directory-panel-wrapper {
      .fcb-campaign-list {
        .fcb-campaign-folder {
          align-items: flex-start;
          justify-content: flex-start;

          &.active {
            background: #cfcdc2;
          }
        }

        .fcb-campaign-folder > .folder-header {
          border-bottom: none;
          width: 100%;
          flex: 1;
        }

        .fcb-campaign-folder:not(.collapsed) > .folder-header {
          background: var(--fcb-sidebar-campaign-background);
          color: var(--fcb-sidebar-campaign-color);
        }

        .fcb-campaign-folder.collapsed > .folder-header {
          background: var(--fcb-sidebar-campaign-background-collapsed);
          color: var(--fcb-sidebar-campaign-color-collapsed);
          text-shadow: none;
        }

        .fcb-campaign-folder .folder-header {
          background: inherit;
          border: 0px;
          text-shadow: none;   // override foundry default
          cursor: pointer;

          i.icon {
            color: var(--fcb-sidebar-topic-icon-color);
          }  
        }

        // change icon to closed when collapsed
        .fcb-campaign-folder.collapsed > .folder-header i.fa-folder-open:before {
          content: "\f07b";
        }

        .campaign-contents {
          margin: 0px;
          width: 100%;
          padding-left: 10px;
        }    
      }
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
    
    // add margin when these are immediate children of summary
    div.summary.top > .fcb-directory-entry,
    div.summary.top > .fcb-current-directory-entry {
      margin-left: 8px;
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