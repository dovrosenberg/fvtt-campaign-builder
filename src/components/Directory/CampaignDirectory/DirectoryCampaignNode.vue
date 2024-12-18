<template>
  <li 
    :class="'fwb-campaign-folder folder entry flexcol fwb-directory-compendium ' + (props.campaignNode.expanded ? '' : 'collapsed')" 
    :data-campaign="props.campaignNode.id"
  >
    <header class="folder-header flexrow">
      <div 
        class="fwb-compendium-label noborder" 
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
      class="campaign-contents fwb-directory-tree"
    >
      <SessionDirectoryNode 
        v-for="node in props.campaignNode.loadedChildren"
        :key="node.id"
        :session-node="node"
        :top="true"
        class="fwb-entry-item" 
        draggable="true"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType } from 'vue';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useNavigationStore, } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components
  import SessionDirectoryNode from './SessionDirectoryNode.vue';
  
  // types
  import { DirectoryCampaignNode, } from '@/classes';
  import { WindowTabType } from '@/types';
  
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

  ////////////////////////////////
  // data
  // we don't just use props node because in toggleWithLoad we want to swap it out without rebuilding
  //   the whole tree
  const currentNode = ref<DirectoryCampaignNode>(props.campaignNode);
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // change campaign
  const onCampaignFolderClick = async (_event: MouseEvent) => {
    currentNode.value = await campaignDirectoryStore.toggleWithLoad(currentNode.value, !currentNode.value.expanded);
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
      customClass: 'fwb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: getTabTypeIcon(WindowTabType.Session),
          iconFontClass: 'fas',
          label: localize('fwb.contextMenus.campaignFolder.createSession'), 
          onClick: async () => {
            await campaignDirectoryStore.createSession(props.campaignNode.id);
          }
        },
        { 
          icon: 'fa-trash',
          iconFontClass: 'fas',
          label: localize('fwb.contextMenus.campaignFolder.delete'), 
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
  #fwb-directory {
    // the campaign list section
    .fwb-directory-panel-wrapper {
      .fwb-campaign-list {
        .fwb-campaign-folder {
          align-items: flex-start;
          justify-content: flex-start;

          &.active {
            background: #cfcdc2;
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

        .fwb-campaign-folder .folder-header {
          background: inherit;
          border: 0px;
          text-shadow: none;   // override foundry default
          cursor: pointer;

          i.icon {
            color: #777;
          }  
        }

        // change icon to closed when collapsed
        .fwb-campaign-folder.collapsed > .folder-header i.fa-folder-open:before {
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

          .fwb-campaign-folder.collapsed .fwb-campaign-contents {
            display: none;
          }

          .fwb-campaign-contents {
            padding-left: 20px;
            margin: 0px;
          }
        }    
      }
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