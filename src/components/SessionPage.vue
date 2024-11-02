<template>
  <div>
    A lot of text
    {{ shortDescription }}
  </div>  
</template> 

<script setup lang="ts">
  // library imports
  import { onMounted, PropType, ref } from 'vue';

  // local imports

  // library components

  // local components

  // types
  
  ////////////////////////////////
  // props
  const props = defineProps({
    document: {
      type: Object as PropType<JournalEntryPage>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  
  ////////////////////////////////
  // data
  const shortDescription = ref('');

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    debugger;
    const passDoc = props.passDoc;

    shortDescription.value = await globalThis.TextEditor.enrichHTML(passDoc.system.description.short, {
      async: true,
      secrets: passDoc.isOwner,
      relativeTo: passDoc,
    });
  });
</script>

<style lang="scss">
// this is from the Vue handler, but we need it to be a flexbox so the overall app window controls the size the rest
//    of the way down
div[data-application-part] {
  display: flex;
  flex-direction: column;
  flex: 1;
}


// the launch button in the top right corner
#fwb-launch {
  background-color: rgba(0,0,0,.5);
  color: var(--color-text-light-highlight);
}

/*
.fwb-main-window > header a.subsheet {
  background: rgba(255, 255, 255, 0.1);
  margin-left: 0px;
  padding-left: 8px;
}

.fwb-main-window > header a.subsheet.first {
  margin-left: 4px;
  padding-left: 4px;
}

.fwb-main-window > header a.subsheet.last {
  padding-right: 4px;
}
*/

.fwb-main-window {  
  min-width: 640px;

  .window-content > div {
    overflow: hidden;
  }

  .fwb {
    height: 100%;
    width: 100%;
    margin-top: 0px;
    flex-wrap: nowrap;

    // Sidebar 
    #fwb-directory-sidebar {
      display: flex;
      flex: 0 0 250px;
      height: 100%;
      overflow: hidden;
      background: var(--fwb-sidebar-background);
      border-left: 1px solid var(--fwb-header-border-color);
      transition: width 0.5s, flex 0.5s;

      & > div {
        display: flex !important;
        height: 100%;
      }
    }

    #journal .entry-name > i,
    #fwb-directory .entry-name > i {
      margin-right: 8px;
      margin-left: 4px;
      flex: 0 0 15px;
    }

  // changes when sidebar collapses
    &.collapsed {
      .fwb-header .fwb-tab-bar {
        padding-right: 30px;

        #context-menu {
          left: var(--fwb-context-x);
          width: 225px;
        }
      }
      .fwb-footer {
        padding-right: 26px;
      }
      #fwb-directory-sidebar {
        flex: 0 0 0px;
        width: 0px;
        overflow: hidden;
      }
      #fwb-sidebar-toggle {
        right: 6px;
        top: 4px;
        width: auto;
      }
    }

    .fwb-body {
      height: 100%;
    }
  }

  .fwb-content {
    flex: 1;
    height: 100%;
    overflow: hidden;
    position: relative;
    width: 100%;
  }
  
}

</style>