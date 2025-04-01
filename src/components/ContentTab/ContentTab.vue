<template>
  <div 
    ref="contentRef"
    class="sheet wcb-journal-sheet"
  >      
    <div 
      v-if="currentContentType===WindowTabType.Entry"
      class="wcb-content-wrapper"
    >
      <EntryContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.World"
      class="wcb-content-wrapper"
    >
      <WorldContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.Session"
      class="wcb-content-wrapper"
    >
      <SessionContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.Campaign"
      class="wcb-content-wrapper"
    >
      <CampaignContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.PC"
      class="wcb-content-wrapper"
    >
      <PCContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.NewTab"
      class="wcb-content-wrapper"
    >
      <HomePage />
    </div>
    <div v-else>
      <!-- Unknown content type - likely means we're still loading -->
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore, } from '@/applications/stores';

  // library components

  // local components
  import EntryContent from '@/components/ContentTab/EntryContent/EntryContent.vue';
  import SessionContent from '@/components/ContentTab/SessionContent/SessionContent.vue';
  import PCContent from '@/components/ContentTab/PCContent.vue';
  import CampaignContent from '@/components/ContentTab/CampaignContent/CampaignContent.vue';
  import HomePage from '@/components/ContentTab/HomePage.vue';
  import WorldContent from '@/components/ContentTab/WorldContent.vue';
  
  // types
  import { WindowTabType } from '@/types';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentContentType } = storeToRefs(mainStore); 

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
  .wcb-journal-sheet {
    &.sheet {
      height: 100%;
    }
    
    & > form {
      padding: 0px;
      overflow: hidden;
    }
    
    &.sheet {
      form {
        height: 100%;
      }
    
      .wcb-sheet-container {
        height: 100%;
        width: 100%;
        overflow: hidden;
        color: var(--wcb-sheet-color);
        padding: 4px;
      }
      
      .wcb-sheet-container #context-menu {
        font-family: var(--font-primary);
      }
      
      .window-resizable-handle {
        z-index: 100;
      }

      .wcb-name-header {
        font-size: var(--font-size-20);
        font-weight: 700;
        font-family: var(--wcb-font-family);
        align-items: center;
        overflow-y: visible;
        margin-bottom: 4px;
        
        .wcb-input-name {
          background: var(--wcb-sheet-header-name-background);
          color: var(--wcb-sheet-header-name-color);
          margin-left: 3px;
          margin-right: 8px;
          font-size: 32px;
          height: 36px;

          &:not(:focus){
            border-bottom: 1px solid #777;
            border-radius: 0px;
            border-right: 0px transparent;
            border-left: 0px transparent;
            border-top: 0px transparent;
          }
        }

        button {
          margin-right: 4px;
          flex: 0 0 30px;
          height: 30px;
          width: 30px;
          font-size: 18px;
          line-height: 28px;
          padding: 0px 3px;
          cursor: pointer;
          box-shadow: none;
          color: var(--wcb-sheet-header-button-color);
          background: var(--wcb-sheet-header-button-background);
          border: 1px solid var(--button-border-color);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 3px 5px 0px 8px;

          &:last-child {
            margin-right: 8px;
          }

          &:hover {
            background: var(--button-hover-background-color);
            border-color: var(--button-hover-border-color);
            color: var(--button-hover-text-color);
          }

          i {
            font-size: 14px;
            color: currentColor;
          }
        }

        .sheet-icon {
        line-height: 35px;
        margin-top: 0px;
        color: var(--wcb-sheet-header-icon-color);
        flex: 0 0 20px;
        font-size: 20px;
        }
      }

      // Nav
      .wcb-sheet-navigation {
        flex-grow: 0;
        flex: 0 0 30px !important;
        background: var(--wcb-sheet-tab-background);
        padding: 0px 4px 5px 4px;
        border-bottom: 2px groove var(--wcb-sheet-tab-bottom-border);
        font-family: var(--wcb-font-family);
        font-size: 18px;
        font-weight: 700;

        &.tabs {
          flex-wrap: wrap;
          
          .item {
            flex: 1;
            height: 30px !important;
            line-height: 32px;
            margin: 0 24px;
            border-bottom: var(--wcb-sheet-tab-border);
            color: var(--wcb-sheet-tab-color);
            max-width: 150px;
          }

          .item:hover {
            color: var(--wcb-sheet-tab-color-hover);
          }

          .item.hasitems {
            border-bottom-color: var(--wcb-sheet-tab-border-items);
          }

          .item.active {
            border-bottom-color: var(--wcb-sheet-tab-border-active);
            color: var(--wcb-sheet-tab-color-active);
          }

          .tab {
            flex: 1;
          }
        }
      }

      /* Dialog */
      .dialog-content {
        margin-bottom: 8px;
      }

      // the tab content
      .wcb-tab-body {
        flex: 1;
        padding: 4px;

        h6 {
          margin-top: 1rem;
        }
      }

      .wcb-sheet-container a[disabled] {
        pointer-events: none;
      }

      .wcb-journal-subsheet:not(.gm) .gm-only {
        display: none;
      }
      
      .wcb-journal-subsheet:not(.owner) .owner-only {
        display: none;
      }
      
      /* Page Controls (Mostly for list)*/
      .page-controls {
        flex-grow: 0;
        padding-top: 1px;
        border-bottom: 2px groove var(--wcb-sheet-details-section-border);

        button {
          flex: 0 0 130px;
          background: var(--wcb-sheet-page-control-background);
          color: var(--wcb-sheet-page-control-color);
        }

        button:hover {
          background: var(--wcb-sheet-page-control-background-hover);
        }

        button.wcb-header-control {
          flex: 0 0 30px;
        }
      }

      /* Body */
      .wcb-sheet-container .wcb-tab-body {
        height: 100%;
        overflow: hidden;
        position: relative;
      }

      /* Tabs */
      &.sheet .wcb-tab-body .tab {
        height: 100% !important;
        overflow-y: auto !important;
        align-content: flex-start;
        flex: 1;
      }

      &.sheet .wcb-tab-body .tab .tab-inner {
        height: 100%;
        overflow-y: auto !important;
        align-content: flex-start;
        position: relative;
        padding-top: 2px;

        &.flexcol {
          flex:1;
        }
      }

      /* Editor */
      .editor {
        overflow: visible;
        height: 100%;
        min-height: 100%;

        .editor-content {
          overflow-y: visible;
          height: unset;
          min-height: calc(100% - 8px);
          padding: 2px;
        }
      }
    }
      

    // the button to open the editor
    .editor-edit {
      position: relative;
      z-index: 1;
      left: calc(100% - 15px);
      top: 3px;

      &:hover {
        color: green;
        background: orange;
        box-shadow: 0 0 5px red;
      }
    }

    .wcb-content-wrapper {
      height: 100%;
    } 
  }
</style>