<template>
  <!-- these are the campaigns -->
  <ol class="fcb-campaign-list">
    <li 
      v-if="currentWorld" 
      class="fcb-world-folder folder flexcol" 
    >
      <header 
        class="folder-header flexrow"
        @contextmenu="onHeaderContextMenu"
      >
        <div class="noborder">
          <i class="fas fa-folder-open fa-fw"></i>
          {{ currentWorld.name }} Campaigns
        </div>
      </header>

      <ol v-if="campaignDirectoryStore.currentCampaignTree.value.length>0">
        <DirectoryCampaignNodeComponent 
          v-for="campaign in campaignDirectoryStore.currentCampaignTree.value as DirectoryCampaignNode[]"
          :key="campaign.id"
          :campaign-node="campaign"
        />
      </ol>
    </li>
  </ol>
</template>

<script setup lang="ts">
  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useMainStore, } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components
  import DirectoryCampaignNodeComponent from './DirectoryCampaignNode.vue';
  
  // types
  import { DirectoryCampaignNode, } from '@/classes';
  import { WindowTabType } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentWorld, isInPlayMode } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  const onHeaderContextMenu = (event: MouseEvent): void => {
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
          icon: getTabTypeIcon(WindowTabType.Campaign),
          iconFontClass: 'fas',
          label: localize('contextMenus.campaignsHeader.createCampaign'), 
          disabled: isInPlayMode.value,
          onClick: async () => {
            await campaignDirectoryStore.createCampaign();
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
    .action-buttons {
      padding-left: 30px;
    }

    // the campaign list section
    .fcb-directory-panel-wrapper {
      .fcb-campaign-list {
        padding: 0;
        flex-grow: 1;
        overflow: auto;
        margin-top: 3px;
      }
  }

  // the nested tree structure
  // https://www.youtube.com/watch?v=rvKCsHS590o&t=1755s has a nice overview of how this is assembled

  .fcb-directory-compendium {
    .fcb-entry-item, .fcb-type-item {
      position: relative;
      padding-left: 0.5em;
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
        background: var(--fcb-directory-expand-button-background);
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
}
</style>