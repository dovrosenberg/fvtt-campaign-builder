<template>
  <div 
    ref="contentRef"
    class="sheet fcb-journal-sheet"
  >      
    <div 
      v-if="currentContentType===WindowTabType.Entry"
      class="fcb-content-wrapper"
    >
      <EntryContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.World"
      class="fcb-content-wrapper"
    >
      <WorldContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.Session"
      class="fcb-content-wrapper"
    >
      <SessionContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.Campaign"
      class="fcb-content-wrapper"
    >
      <CampaignContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.PC"
      class="fcb-content-wrapper"
    >
      <PCContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.NewTab"
      class="fcb-content-wrapper"
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
  .fcb-journal-sheet {
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
    
      .fcb-sheet-container {
        height: 100%;
        width: 100%;
        overflow: hidden;
        color: var(--fcb-sheet-color);
        padding: 4px;
      }
      
      .fcb-sheet-container #context-menu {
        font-family: var(--font-primary);
      }
      
      .window-resizable-handle {
        z-index: 100;
      }

      .fcb-name-header {
        font-size: var(--font-size-20);
        font-weight: 700;
        font-family: var(--fcb-font-family);
        align-items: center;
        overflow-y: visible;
        margin-bottom: 4px;
        
        .fcb-input-name {
          background: var(--fcb-sheet-header-name-background);
          color: var(--fcb-sheet-header-name-color);
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
          color: var(--fcb-sheet-header-button-color);
          background: var(--fcb-sheet-header-button-background);
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
        color: var(--fcb-sheet-header-icon-color);
        flex: 0 0 20px;
        font-size: 20px;
        }
      }

      // Nav
      .fcb-sheet-navigation {
        flex-grow: 0;
        flex: 0 0 30px !important;
        background: var(--fcb-sheet-tab-background);
        padding: 0px 4px 5px 4px;
        border-bottom: 2px groove var(--fcb-sheet-tab-bottom-border);
        font-family: var(--fcb-font-family);
        font-size: 18px;
        font-weight: 700;

        &.tabs {
          flex-wrap: wrap;
          justify-content: flex-start;
          
          .item {
            flex: 0 0 auto;
            height: 30px !important;
            line-height: 32px;
            margin: 0 12px;
            border-bottom: var(--fcb-sheet-tab-border);
            color: var(--fcb-sheet-tab-color);
            max-width: 150px;

            &.first-child {
              margin-left: 0;
            }
          }

          .item:hover {
            color: var(--fcb-sheet-tab-color-hover);
          }

          .item.active {
            border-bottom-color: var(--fcb-sheet-tab-border-active);
            color: var(--fcb-sheet-tab-color-active);
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
      .fcb-tab-body {
        flex: 1;
        padding: 4px;

        h6 {
          margin-top: 1rem;
        }
      }

      .fcb-sheet-container a[disabled] {
        pointer-events: none;
      }

      /* Page Controls (Mostly for list)*/
      .page-controls {
        flex-grow: 0;
        padding-top: 1px;
        border-bottom: 2px groove var(--fcb-sheet-details-section-border);

        button {
          flex: 0 0 130px;
          background: var(--fcb-sheet-page-control-background);
          color: var(--fcb-sheet-page-control-color);
        }

        button:hover {
          background: var(--fcb-sheet-page-control-background-hover);
        }

        button.fcb-header-control {
          flex: 0 0 30px;
        }
      }

      /* Body */
      .fcb-sheet-container .fcb-tab-body {
        height: 100%;
        overflow: hidden;
        position: relative;
      }

      /* Tabs */
      &.sheet .fcb-tab-body .tab {
        height: 100% !important;
        overflow-y: auto !important;
        align-content: flex-start;
        flex: 1;
      }

      &.sheet .fcb-tab-body .tab .tab-inner {
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
        width: 100%;
        min-height: 100%;
        position: relative;

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
      position: absolute;
      z-index: 1;
      right: 4px;
      top: 3px;
      color: coral;

      &:hover {
        color: green;
        background: orange;
        box-shadow: 0 0 5px red;
      }
    }

    .fcb-content-wrapper {
      height: 100%;
    } 
  }
</style>