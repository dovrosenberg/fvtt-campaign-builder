<template>
  <!-- these are the campaigns -->
  <ol class="fcb-campaign-list">
    <CampaignDirectoryCampaignNode
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
  import { useCampaignDirectoryStore, useMainStore, } from '@/applications/stores';

  // library components
  
  // local components
  import CampaignDirectoryCampaignNode from './CampaignDirectoryCampaignNode.vue';
  
  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const { currentSetting, } = storeToRefs(mainStore);
  const { currentCampaignTree } = campaignDirectoryStore;
  
  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // const onHeaderContextMenu = (event: MouseEvent): void => {
  //   //prevent the browser's default menu
  //   event.preventDefault();
  //   event.stopPropagation();

  //   //show our menu
  //   ContextMenu.showContextMenu({
  //     customClass: 'fcb',
  //     x: event.x,
  //     y: event.y,
  //     zIndex: 300,
  //     items: [
  //       { 
  //         icon: getTabTypeIcon(WindowTabType.Campaign),
  //         iconFontClass: 'fas',
  //         label: localize('contextMenus.campaignsHeader.createCampaign'), 
  //         disabled: isInPlayMode.value,
  //         onClick: async () => {
  //           await campaignDirectoryStore.createCampaign();
  //         }
  //       },
  //     ]
  //   });
  // };

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

          // bold the active one
          &.active {
            color: var(--fcb-accent-400);
            font-weight: bold;
          }

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

            // if it contains 
          }

          &.collapsed > .folder-header {
            background: var(--fcb-sidebar-campaign-background-collapsed);
            color: var(--fcb-sidebar-campaign-color-collapsed);
            text-shadow: none;
          }

          .folder-header {
            background: inherit;
            border: 0px;
            text-shadow: none;   // override foundry default
            cursor: pointer;

            i.icon {
              color: var(--fcb-sidebar-topic-icon-color);
            }  
          }

          // change icon to closed when collapsed
          &.collapsed > .folder-header i.fa-folder-open:before {
            content: "\f07b";
          }

          div.details {
            padding-left: 0.5em;
            
            // For simple nodes without children (no ul), add margin-bottom to match the ul margin-top
            &:not(:has(ul)) {
              margin-bottom: 0.25rem;
            }
          }

          .node-name {
            &.active {
              font-weight: 700px;
              color: var(--fcb-accent-400);
            }
          }

          &.campaign-completed {      
            color: var(--fcb-text-muted) !important;
            opacity: 0.8 !important;
          
            .node-name {
              font-style: italic;
            }

            .completed-icon {
              margin-left: 4px;
            }
          }   

          .campaign-contents {
            margin: 0px;
            width: 100%;
            padding-left: 10px;
          }
        }      
      }
    }

    .fcb-campaign-contents {
      // make sure it goes behind the header
      z-index: 1;
    }
  }

  .fcb-campaign-folder{
    // font-size: var(--fcb-font-size);
    // font-family: var(--fcb-font-family);

    .fcb-directory-entry, .fcb-current-directory-entry {
      position: relative;
      padding-left: 1em;
      cursor: pointer;
    }

    .fcb-directory-entry {
      font-weight: 400;
    }

    // bold the active one
    .fcb-current-directory-entry {
      color: var(--fcb-accent-400);
      font-weight: 700;
    }

    // add margin when these are immediate children of summary
    div.summary.top > .fcb-directory-entry,
    div.summary.top > .fcb-current-directory-entry {
      margin-left: 8px;
    }

    // leaving this here for when we introduce story arcs
    // ul {
    //   list-style: none;
    //   line-height: 2em;   // this makes the horizontal lines centered (when combined with the height on the li::before

    //   li {
    //     position: relative;
    //     padding: 0;
    //     margin: -0.5em 0 0 0;

    //     font-weight: normal;

    //     // this draws the top-half ot the vertical plus the horizontal tree connector lines
    //     &::before {
    //       top: 0px;
    //       border-bottom: 2px solid gray;
    //       height: 1em;   // controls vertical position of horizontal lines
    //     }

    //     // extends the vertical lines down
    //     &::after {
    //       bottom: 0px;
    //       height: 100%;
    //     }

    //     &::before, &::after {
    //       content: "";
    //       position: absolute;
    //       left: -10px;   // pushes them left of the text
    //       border-left: 2px solid gray;
    //       width: 10px;   // controls the length of the horizontal lines
    //     }

    //     &:last-child::after {
    //       display: none;   // avoid a little tail at the bottom of the vertical lines
    //     }
    //   }
    // }

    // // move the text away from the end of the horizontal lines
    // li {
    //   padding-left: 3px;
    // }
  }
</style>