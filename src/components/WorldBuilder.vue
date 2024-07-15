<template>
  <div  
    :class="'fwb flexrow ' + (directoryCollapsed ? 'collapsed' : '')"
    @click="onClickApplication($event)"
  >
    <div class="fwb-body flexcol">
      <WBHeader />
      <div class="fwb-content flexcol editable">
        <WBContent />
      </div>
    </div>
    <div id="fwb-directory-sidebar" class="flexcol">
      <Directory @world-selected="onDirectoryWorldSelected" />
    </div> 
  </div>
</template> 

<script setup lang="ts">
  // library imports
  import { onMounted, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getDefaultFolders, } from '@/compendia';
  import { SettingKey, moduleSettings } from '@/settings/ModuleSettings';
  import { useMainStore, useDirectoryStore, useNavigationStore } from '@/applications/stores';

  // library components

  // local components
  import WBHeader from '@/components/WBHeader.vue';
  import WBContent from '@/components/WBContent.vue';
  import Directory from '@/components/Directory/Directory.vue';

  // types
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const directoryStore = useDirectoryStore();
  const navigationStore = useNavigationStore();
  const { currentWorldFolder, rootFolder } = storeToRefs(mainStore);
  const { directoryCollapsed } = storeToRefs(directoryStore);
  
  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDirectoryWorldSelected = async (worldId: string) => {
    await directoryStore.changeWorld(worldId);
  };

  // whenever we click on a link inside the application that is a link to a document (these are inserted by TextEditor.enrichHTML)
  //    if it's a document in world builder, open in here instead of the default functionality
  const onClickApplication = (event: JQuery.ClickEvent) => {
    // ignore anything that's not an <a> with class 'content-link'
    if (event.target.tagName!=='A')
      return;

    let found=false;
    for (let i=0; i< event.target.classList.length; i++) {
      if (event.target.classList[i]==='fwb-content-link' && event.target.dataset.uuid) {
        found=true; 
        break;
      }
    }
    if (!found)
      return;

    // cancel any other actions
    event.stopPropagation();
    
    // the only things tagged fwb-content-link are ones for the world we're looking at, so just need to open it
    void navigationStore.openEntry(event.target.dataset.uuid, { newTab: event.ctrlKey});
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    directoryCollapsed.value = moduleSettings.get(SettingKey.startCollapsed) || false;

    const folders = await getDefaultFolders();

    if (folders && folders.rootFolder && folders.worldFolder) {
      // this will force a refresh of the directory
      rootFolder.value = folders.rootFolder;
      currentWorldFolder.value = folders.worldFolder;
    } else {
      throw new Error('Failed to load or create folder structure');
    }
  });


  /*


  searchText(query) {
    let that = this;
    $('.editor .editor-content,.journal-entry-content', this.element).unmark().mark(query, {
      wildcards: 'enabled',
      accuracy: "complementary",
      separateWordSearch: false,
      noMatch: function () {
        if (query != '')
          $('.mainbar .navigation .search', that.element).addClass('error');
      },
      done: function (total) {
        if (query == '')
          $('.mainbar .navigation .search', that.element).removeClass('error');
        if (total > 0) {
          $('.mainbar .navigation .search', that.element).removeClass('error');
          let first = $('.editor .editor-content mark:first,.journal-entry-content .scrollable mark:first', that.element);
          $('.editor', that.element).parent().scrollTop(first.position().top - 10);
          $('.scrollable', that.element).scrollTop(first.position().top - 10);
        }
      }
    });
  }



  findMapEntry(event) {
    let journalId = $(event.currentTarget).attr('page-id');
    let journalId = $(event.currentTarget).attr('journal-id');

    let note = canvas.notes.placeables.find(n => {
      return n.document.entryId == journalId || n.document.journalId == journalId || (n.document.entryId == journalId && n.document.journalId == null);
    });
    canvas.notes.panToNote(note);
  }

  doShowPlayers(event) {
    if (event.shiftKey)
      this._onShowPlayers({ data: { users: null, object: this.object, options: { showpic: false } } });
    else if (event.ctrlKey)
      this._onShowPlayers({ data: { users: null, object: this.object, options: { showpic: true } } });
    else {
      this._onShowPlayers(event);
    }
  }

  }*/

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