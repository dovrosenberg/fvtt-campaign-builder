<template>
  <!-- these are the campaigns -->
  <ol class="fcb-campaign-list">
    <li 
      v-if="currentSetting" 
      class="fcb-setting-folder folder flexcol" 
    >
      <header 
        class="folder-header flexrow"
        @contextmenu="onHeaderContextMenu"
      >
        <div class="noborder">
          <i class="fas fa-folder-open fa-fw"></i>
          {{ currentSetting.name }} Campaigns
        </div>
      </header>

      <!-- Note that we have to use value despite being in a template because it's reactive not ref -->
      <ol v-if="currentCampaignTree.value.length > 0" class="fcb-campaign-contents">
        <DirectoryCampaignNodeComponent 
          v-for="campaign in currentCampaignTree.value"
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

    // the campaign list section
    .fcb-directory-panel-wrapper {
      .fcb-campaign-list {
        padding: 0;
        flex-grow: 1;
        /* overflow: hidden; */
        margin-top: 3px;

        .fcb-setting-folder > .folder-header {
          background: inherit !important;
          font-weight: 700;
        }
      }

      .fcb-campaign-contents {
        // make sure it goes behind the header
        z-index: 1;
      }
  }
}
</style>