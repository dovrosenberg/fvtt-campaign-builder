<template>
  <div 
    ref="contentRef"
    class="sheet fwb-journal-sheet"
  >      
    <EntryContent v-if="currentContentType===WindowTabType.Entry" />
    <SessionContent v-else-if="currentContentType===WindowTabType.Session" />
    <CampaignContent v-else-if="currentContentType===WindowTabType.Campaign" />
    <HomePage v-else />
  </div>
</template>

<script setup lang="ts">

  // library imports
  import { storeToRefs } from 'pinia';

   // local imports
  import { useMainStore, } from '@/applications/stores';

  // library components

  // local components
  import HomePage from './HomePage.vue';
  import EntryContent from './EntryContent.vue';
  
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

  .fwb-journal-sheet {
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
    
      .sheet-container {
        height: 100%;
        width: 100%;
        overflow: hidden;
        color: var(--fwb-sheet-color);
      }
      
      .sheet-container.detailed {
        padding: 4px;
      }
      
      .sheet-container #context-menu {
        font-family: var(--font-primary);
      }
      
      .window-resizable-handle {
        z-index: 100;
      }

      .journal-sheet-header .sheet-image {
        flex: 0 0 160px;
        font-size: 13px;
        max-width: 160px;
        height: 160px;
        position: relative;
        border-radius: 5px;
        border: 1px solid var(--fwb-icon-outline);
        margin-right: 6px;
        overflow: hidden;
      }
    
      .journal-sheet-header .sheet-image img.profile {
        width: 100%;
        height: 100%;
        object-fit: contain;
        max-width: 100%;
        border: 0px;
        background: var(--fwb-icon-background);
        -webkit-box-shadow: 0 0 10px var(--fwb-icon-shadow) inset;
        box-shadow: 0 0 10px var(--fwb-icon-shadow) inset;
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
      }
    
      /* Nav */
      .fwb-sheet-navigation {
        flex-grow: 0;
        flex: 0 0 30px !important;
        background: var(--fwb-sheet-tab-background);
        padding-bottom: 5px;
        border-bottom: 2px groove var(--fwb-sheet-tab-bottom-border);
        font-family: var(--fwb-font-family);
        font-size: 20px;
        font-weight: 700;

        &.tabs {
          flex-wrap: wrap;
          
          .item {
            flex: 1;
            height: 30px !important;
            line-height: 32px;
            margin: 0 24px;
            border-bottom: var(--fwb-sheet-tab-border);
            color: var(--fwb-sheet-tab-color);
            max-width: 150px;
          }

          .item:hover {
            color: var(--fwb-sheet-tab-color-hover);
          }

          .item.hasitems {
            border-bottom-color: var(--fwb-sheet-tab-border-items);
          }

          .item.active {
            border-bottom-color: var(--fwb-sheet-tab-border-active);
            color: var(--fwb-sheet-tab-color-active);
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

      /* Header Details */
      .journal-sheet-header .header-details {
        font-size: var(--font-size-20);
        font-weight: 700;
        //overflow: hidden;
        /*width: calc(100% - 160px);*/
      }

      .journal-sheet-header .header-details input {
        border: var(--fwb-sheet-header-input-border);
        background: var(--fwb-sheet-header-input-background);
      }

      .journal-sheet-header .header-details .header-name {
        margin: 0;
      }

      .journal-sheet-header .header-details .header-name input[type="text"] {
        font-size: 32px;
        height: 36px;
      }

      .journal-sheet-header .header-details .form-group {
        margin: 4px 8px 0px 0px;
      }
      .journal-sheet-header .header-details .form-group label {
        max-width: 175px;
        color: var(--fwb-sheet-header-label-color);
        text-align: left;
        background: none;
        border: none;
      }
      .journal-sheet-header .header-details .form-group input {
        font-size: var(--font-size-20);
        color: var(--fwb-sheet-header-detail-input-color);
      }

      .journal-sheet-header .header-details .form-group select {
        border: var(--fwb-sheet-header-input-border);
        font-size: inherit;
        font-family: inherit;
        height: calc(var(--font-size-20) + 6);
        margin: 0px;
        color: var(--fwb-sheet-header-detail-input-color);
        background: var(--fwb-sheet-header-input-background);
      }

      .journal-sheet-header .header-details .form-group select:hover {
        box-shadow: 0 0 8px var(--color-shadow-primary);
      }

      .fwb-content-header {
        overflow-y: visible;
      }

      .journal-sheet-header .header-details .header-name input[type="text"] {
        background: var(--fwb-sheet-header-name-background);
        border: 1px solid transparent;
        color: var(--fwb-sheet-header-name-color);
        margin-right: 2px;
      }

      .journal-sheet-header .header-details .header-name input[type="text"]:hover,
      .journal-sheet-header .header-details .header-name input[type="text"]:focus {
        background: var(--fwb-sheet-header-name-background-hover);
      }

      // the tab content
      .fwb-tab-body {
        display: flex;
        flex: 1;

        /* Details Section */
        .details-section {
          font-family: var(--fwb-font-family);
          font-size: var(--font-size-20);
          font-weight: 700;
          padding: 5px 15px;
          margin: 0px;
          flex-grow: 0;
          border-bottom: 2px groove var(--fwb-sheet-details-section-border);

          &:last-child,
          &.no-border {
            border-bottom: 0px;
          }
          &.scrollable {
            flex-grow: 1;
            overflow-y: auto;
          }

          .form-group {
            flex-grow: 0 !important;
            margin: 4px 8px 0px 0px;
          }

          label {
            flex: 1;
            max-width: 175px;
            color: var(--fwb-sheet-color);
          }
          input, textarea {
            border: var(--fwb-sheet-input-border);
            background: var(--fwb-sheet-input-background);
            color: var(--fwb-sheet-input-color);
          }

          select {
            font-size: var(--font-size-20);
            height: 24px;
          }

          button {
            flex: 0;
            margin: -2px 0;
            line-height: 22px;
          }

          button.append {
            height: 27px;
            margin: 0px;
            border-top-left-radius: 0px;
            border-bottom-left-radius: 0px;
            order: 99;
          }

          button.append + input {
            border-top-right-radius: 0px;
            border-bottom-right-radius: 0px;
          }

          /* Document Details */
          .document-details {
            border-radius: 5px;
            padding: 8px;
            margin-bottom: 5px;
            position: relative;
            flex: 1;
            font-size: var(--font-size-14);

            ul {
              margin: 0;
              padding: 0;
              display: flex;
              gap: 4px;
              flex: 1;
              flex-wrap: wrap;
              list-style: none;

              li {
                display: flex;
                flex: 0 0 215px;

                label {
                  flex: 0 0 60px;
                }
              }
            }
          }
        }
      }
    }

    .sheet-container a[disabled] {
      pointer-events: none;
    }

    .nav-button.convert #context-menu {
      margin-left: -95px;
    }

    /* Header */
    .sheet-container .journal-sheet-header {
      font-family: var(--fwb-font-family);
      font-size: 24px;
      flex-grow: 0;
      border-bottom: 2px solid var(--fwb-sheet-header-border);
      z-index: 1;
      padding-left: 8px;
    }

    .sheet-container.detailed .journal-sheet-header {
      align-items: flex-start;
      padding-bottom: 4px;
      /*flex: 0 0 162px;*/
      border-bottom: 2px groove var(--fwb-sheet-detailed-header-border);
      margin: 0px;
      padding-left: 0px;
      position: relative;
    }

    .journal-sheet-header.header-name input[type="text"] {
      background: var(--fwb-sheet-header-name-background);
      border: 1px solid transparent;
      color: var(--fwb-sheet-header-name-color);
      margin-right: 2px;
      font-size: 28px;
      height: calc(100% - 2px);
    }

    .journal-sheet-header.header-name input[type="text"]:hover,
    .journal-sheet-header.header-name input[type="text"]:focus {
      background: var(--fwb-sheet-header-name-background-hover);
    }

    .sheet-container .journal-sheet-header .sheet-icon {
      flex: 0 0 30px;
      line-height: 35px;
      margin-top: 0px;
      color: #777;
    }

    .sheet-container.detailed .journal-sheet-header .sheet-icon {
      flex: 0 0 20px;
      font-size: 20px;
      height: 20px;
      margin-top: 12px;
      margin-left: 5px;
      line-height: 15px;
    }

    &.image-popout.dark .journal-sheet-header input[type="text"] {
      color: #fff;
    }

    .journal-sheet-header.header-name .header-search {
      font-size: 14px;
      flex: 0 0 255px;
      color: var(--fwb-sheet-color);

      i {
        flex: 0 0 25px;
        padding-left: 5px;
        line-height: 35px;
      }

      input[type="text"] {
        font-size: var(--font-size-14);
        height: 25px;
        margin-top: 6px;
        margin-right: 4px;
        border: 1px solid var(--fwb-sheet-header-search-border);
        background: var(--fwb-sheet-header-search-background);
        color: var(--fwb-sheet-header-search-color);
    
        &::placeholder {
          color: var(--fwb-sheet-header-search-placeholder);
        }
      
        &:hover,
        &:focus {
          background: var(--fwb-sheet-header-search-background-hover);
        }
      }
    }

    .journal-sheet-header {
      button {
        flex: 0 0 30px;
        height: 30px;
        width: 30px;
        border: none;
        font-size: 18px;
        line-height: 28px;
        padding: 0px 3px;
        cursor: pointer;
        box-shadow: none;
        color: var(--fwb-sheet-header-button-color);
        background: var(--fwb-sheet-header-button-background);
        border-radius: 3px;
        margin-top: 3px;
        margin-right: 5px;
      }
    
      .header-details button {
        margin-right: 4px;

        &:last-child {
          margin-right: 8px;
        }
      }

      button.loading {
        padding-top: 1px;
        padding-left: 5px;
      }

      button.active {
        border: 1px solid var(--fwb-active-color);
        color: var(--fwb-active-color);
      }
    }

    /* Page Controls (Mostly for list)*/
    .page-controls {
      flex-grow: 0;
      padding-top: 1px;
      border-bottom: 2px groove var(--fwb-sheet-details-section-border);

      button {
        flex: 0 0 130px;
        background: var(--fwb-sheet-page-control-background);
        color: var(--fwb-sheet-page-control-color);
      }

      button:hover {
        background: var(--fwb-sheet-page-control-background-hover);
      }

      button.header-control {
        flex: 0 0 30px;
      }
    }

    /* Body */
    .sheet-container .fwb-tab-body {
      height: 100%;
      overflow: hidden;
      position: relative;
    }



    /* Tabs */
    &.sheet .fwb-tab-body .tab {
      height: 100% !important;
      overflow-y: auto !important;
      align-content: flex-start;
      flex: 1;
    }

    &.sheet .fwb-tab-body .tab .tab-inner {
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
      border: var(--fwb-sheet-input-border);
      background: var(--fwb-sheet-input-background);
      color: var(--fwb-sheet-input-color);
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
    .sheet-container .fwb-tab-body .no-character-alert {
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

    .sheet-container .fwb-tab-body .no-character-alert a {
      color: var(--color-text-hyperlink);
    }
  }

</style>