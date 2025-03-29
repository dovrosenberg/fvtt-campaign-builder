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

      .wcb-journal-sheet-header {
        // Header Details 
        .wcb-content-header {
          font-size: var(--font-size-20);
          font-weight: 700;
          font-family: var(--wcb-font-family);
          align-items: flex-start;
          align-self: flex-start;
          overflow-y: visible;
          
          input {
            border: var(--wcb-sheet-header-input-border);
            background: var(--wcb-sheet-header-input-background);
          }

          .header-name {
            margin: 0;
            align-items: center;

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
          }

          .form-group {
            margin: 4px 8px 0px 0px;
          
            label {
              max-width: 175px;
              color: var(--wcb-sheet-header-label-color);
              text-align: left;
              background: none;
              border: none;
            }
            input {
              font-size: var(--font-size-20);
              color: var(--wcb-sheet-header-detail-input-color);
            }

            select {
              border: var(--wcb-sheet-header-input-border);
              font-size: inherit;
              font-family: inherit;
              height: calc(var(--font-size-20) + 6);
              margin: 0px;
              color: var(--wcb-sheet-header-detail-input-color);
              background: var(--wcb-sheet-header-input-background);

              &:hover {
                box-shadow: 0 0 8px var(--color-shadow-primary);
              }
            }
          }
        }

        .wcb-sheet-image {
          flex: 0 0 160px;
          font-size: 13px;
          height: 240px;
          width: 180px;
          position: relative;
          border-radius: 5px;
          border: 1px solid var(--wcb-icon-outline);
          margin-right: 6px;
          overflow: hidden;
          cursor: pointer;
      
          img.profile {
            width: 100%;
            height: 100%;
            object-fit: contain;
            max-width: 100%;
            border: 0px;
            background: var(--wcb-icon-background);
            -webkit-box-shadow: 0 0 10px var(--wcb-icon-shadow) inset;
            box-shadow: 0 0 10px var(--wcb-icon-shadow) inset;
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
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
        padding-bottom: 5px;
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
        display: flex;
        flex: 1;
        padding: 4px;

        h6 {
          margin-top: 1rem;
        }
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

      &.flexcol {
        flex:1;
      }
    }

    .tab.notes .notes-container {
      overflow: auto;
      border: var(--wcb-sheet-input-border);
      background: var(--wcb-sheet-input-background);
      color: var(--wcb-sheet-input-color);
      border-radius: 4px;
      margin-bottom: 3px;
    }

    .tab.notes .notes-container .editor-content {
      padding: 0px 6px;
    }

    /* Editor */
    &.sheet .editor {
      overflow: visible;
      height: 100%;
      min-height: 100%;
    }

    // the button to open the editor
    .editor-edit {
      z-index: 100;

      &:hover {
        color: green;
        background: orange;
        box-shadow: 0 0 5px red;
      }
    }

    &.sheet .editor .editor-content {
      overflow-y: visible;
      height: unset;
      min-height: calc(100% - 8px);
      padding: 2px;
    }

    &.sheet .editor .tox-tinymce {
      height: 100% !important;
      border-top-left-radius: 0px;
      border-top-right-radius: 0px;
    }

    &.sheet .editor.tinymce {
      margin: 0px;
    }

    &.sheet .editor .tox-toolbar-overlord {
      background-color: rgba(255, 255, 255, 0.4);
    }

    &.sheet .editor .tox-tinymce .tox-menubar button {
      height: 15px;
    }

    &.sheet .editor .tox-tinymce .tox-promotion-link {
      display: none;
    }

    
    // .wcb-journal-subsheet[editable='false'] .editor-edit {
    //   display: none !important;
    // }

    .tox.tox-tinymce-aux {
      width: 0px;
    }

    &.sheet .editor-content .polyglot-journal {
      cursor: help;
      background-color: rgba(var(--polyglot-journal-color), 0.1);
    }

    &.sheet .editor-content .polyglot-journal:hover {
      background-color: rgba(var(--polyglot-journal-color), var(--polyglot-journal-opacity));
    }

    /* Additional */
    .wcb-sheet-container .wcb-tab-body .no-character-alert {
      background: rgba(214, 150, 0, 0.8);
      border: 1px solid var(--color-level-warning);
      margin-bottom: 0.5em;
      padding: 6px 8px;
      line-height: 20px;
      border-radius: 5px;
      box-shadow: 0 0 10px var(--color-shadow-dark);
      color: var(--color-text-light-1);
      font-size: var(--font-size-14);
      text-shadow: 1px 1px black;
      flex: 0 0 33px;
    }

    .wcb-sheet-container .wcb-tab-body .no-character-alert a {
      color: var(--color-text-hyperlink);
    }

    /* Text Entry */
    .wcb-journal-subsheet div[data-tab='picture'] #context-menu {
      top: calc(50% - 33px);
      left: calc(50% - 100px);
      max-width: 200px;
    }

    &.sheet .wcb-journal-subsheet div[data-tab='picture'].tab {
      overflow-y: hidden !important;
      overflow-x: hidden !important;
    }
  }

  .wcb-content-wrapper {
    height: 100%;
  }
</style>