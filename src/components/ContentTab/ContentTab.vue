<template>
  <div 
    ref="contentRef"
    class="fcb-journal-sheet sheet"
  >      
    <div 
      v-if="currentContentType===WindowTabType.Entry"
      class="fcb-content-wrapper"
    >
      <EntryContent />
    </div>
    <div 
      v-else-if="currentContentType===WindowTabType.Setting"
      class="fcb-content-wrapper"
    >
      <SettingContent />
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
      v-if="currentContentType===WindowTabType.Front"
      class="fcb-content-wrapper"
    >
      <FrontContent />
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
  import CampaignContent from '@/components/ContentTab/CampaignContent/CampaignContent.vue';
  import HomePage from '@/components/ContentTab/HomePage.vue';
  import SettingContent from '@/components/ContentTab/SettingContent.vue';
  import FrontContent from '@/components/ContentTab/FrontContent/FrontContent.vue';
  
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
      height: 100%;

      form {
        height: 100%;
      }
    
      .fcb-sheet-container {
        height: 100%;
        width: 100%;
        overflow: hidden;
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
        align-items: center;
        overflow-y: visible;
        margin-bottom: 0.25rem;
        
        .fcb-input-name {
          font-size: var(--font-size-32);
          height: 2.25rem;
        }
        
        .fcb-input-sub-name {
          font-size: var(--font-size-20);
          height: 1.75rem;
        }
        
        .fcb-input-name, .fcb-input-sub-name {
          background: none;
          color: var(--fcb-text);
          margin-left: 3px;

          // the box shadow when we're not focused makes the box look like the wrong background color
          box-shadow: none;

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
          flex: 0 0 1.875rem;
          height: 1.875rem;
          width: 1.875rem;
          font-size: var(--font-size-18);
          line-height: 1.75rem;
          padding: 0px 3px;
          cursor: pointer;
          box-shadow: none;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: .1875rem 5px 0px 0px;

          &:first-child {
            margin-left: 5px;
          }

          &:last-child {
            margin-right: 8px;
          }

          i {
            font-size: var(--fcb-font-size-large);
            color: currentColor;
          }
        }

        .sheet-icon {
          line-height: 2.1875rem;
          margin-top: 0px;
          color: var(--fcb-sheet-header-icon-color);
          flex: 0 0 1.25rem;
          font-size: var(--font-size-20);
        }
      }

      // Subtabs
      .fcb-sheet-subtab-container {
          flex: 1;
          align-content: start;
          background: var(--fcb-tab-body-background);
          box-shadow: 0px -2px 4px rgba(0, 0, 0, 0.3);
          border-radius: 6px;
          margin-top: 4px;

        .fcb-subtab-wrapper {
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
        }

        .fcb-sheet-navigation {
          flex-grow: 0;
          flex: 0 0 30px !important;
          padding: 0px 4px 5px 4px;
          border-bottom: 2px groove var(--fcb-sheet-tab-bottom-border);
          font-family: var(--fcb-font-family);
          font-size: 0.9rem;
          font-weight: 600;
          gap: 5px;


          &.tabs {
            flex-wrap: wrap;
            justify-content: flex-start;
            border-top: 0px !important;  // override foundry
            
            .item {
              flex: 0 0 auto;
              height: 1.875rem !important;
              line-height: 2rem;
              margin: 0 12px;
              color: var(--fcb-text);
              border-bottom: var(--fcb-sheet-tab-border);
              max-width: 150px;

              &.first-child {
                margin-left: 0;
              }

              &.active {
                border-bottom-color: var(--fcb-sheet-tab-border-active);
                text-shadow: 0 0 10px var(--fcb-sheet-tab-shadow-active);
              }

              &:hover {
                text-shadow: 0 0 10px var(--fcb-sheet-tab-shadow-hover);
              }
            }
            
            .tab {
              flex: 1;
            }
          }
        }

        // the tab content
      .fcb-tab-body {
          flex: 1;
          padding: 4px;

          h6 {
            margin-top: 1rem;
          }
        }
      }

      /* Dialog */
      .dialog-content {
        margin-bottom: 0.5rem;
      }

      .fcb-sheet-container a[disabled] {
        pointer-events: none;
      }

      /* Page Controls (Mostly for list)*/
      .page-controls {
        flex-grow: 0;
        padding-top: 1px;
        border-bottom: 2px groove var(--fcb-control-border);

        button {
          flex: 0 0 130px;
          background: var(--fcb-sheet-page-control-bg);
          color: var(--fcb-sheet-page-control-color);
        }

        button:hover {
          background: var(--fcb-sheet-page-control-bg-hover);
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
        align-content: flex-start;
        flex: 1;
      }

      &.sheet .fcb-tab-body .tab .tab-inner {
        height: 100%;
        display: flex;
        align-content: flex-start;
        position: relative;
        padding-top: 2px;
        font-family: var(--fcb-font-family);

        &.flexcol {
          flex:1;
        }

        .form-group {
          margin: .25rem 8px 0px 0px;
        
          label {
            font-size: var(--fcb-font-size-large);
            font-weight: 700;
            font-family: var(--fcb-font-family);
            color: var(--fcb-sheet-header-label-color);
            text-align: left;
            background: none;
            border: none;

            // this is for the labels that are on the left side of the field
            &.side-label {
              max-width: 175px;
              align-self: flex-start;
            }
          }

          // this is for ones 
          input {
            font-size: var(--fcb-font-size-large);
          }

          select {
            border: var(--fcb-sheet-header-input-border);
            font-size: inherit;
            font-family: inherit;
            height: calc(var(--fcb-font-size-header) + 6);
            margin: 0px;
            background: var(--fcb-sheet-header-input-background);

            &:hover {
              box-shadow: 0 0 8px var(--fcb-accent);
            }
          }
        }
      }
    }

    .fcb-content-wrapper {
      height: 100%;
    } 
  }
</style>