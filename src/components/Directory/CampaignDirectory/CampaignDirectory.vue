<template>
  <!-- these are the campaigns -->
  <ol class="fcb-campaign-list">
    <DirectoryCampaignNodeComponent
      v-if="currentSetting" 
      v-for="campaign in currentCampaignTree.value"
      :key="campaign.id"
      :campaign-node="campaign"
    />
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
  import { WindowTabType } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentSetting, isInPlayMode } = storeToRefs(mainStore);
  const { currentCampaignTree } = campaignDirectoryStore;
  
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
    // main color
    color: var(--fcb-text);

    // the campaign list section
    .fcb-directory-panel-wrapper {
      .fcb-campaign-list {
        padding: 0;
        flex-grow: 1;
        /* overflow: hidden; */
        margin-top: .1875rem;

        .fcb-campaign-folder {
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
          }
    
          // setting folder styling
          &:not(.collapsed) > .folder-header {
            color: var(--fcb-text);
            background: inherit;
            text-shadow: none;
            position: relative;
          }

          div.details {
            padding-left: 0.5em;
            
            // For simple nodes without children (no ul), add margin-bottom to match the ul margin-top
            &:not(:has(ul)) {
              margin-bottom: 0.25rem;
            }
          }

          
        }
      
        // .fcb-setting-folder > .folder-header {
        //   background: inherit !important;
        //   font-weight: 700;
        // }
      }
    }

    .fcb-campaign-contents {
      // make sure it goes behind the header
      z-index: 1;
    }
  }
</style>