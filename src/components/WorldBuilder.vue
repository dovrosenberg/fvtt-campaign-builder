<template>
  <div 
    :class="'fwb flexrow ' + (directoryCollapsed ? 'collapsed' : '')"
  >
    <section class="fwb-body flexcol">
      <WBHeader 
        :directoryCollapsed="directoryCollapsed"
        @directory-collapse-toggle="onDirectoryCollapseToggle"
      />
      <div class="fwb-content flexcol editable">
        <WBContent />
      </div>
    </section>
    <div id="fwb-directory-sidebar">
      <Directory 
        @world-selected="onDirectoryWorldSelected"
      />
    </div> 
  </div>
</template> 

<script setup lang="ts">
  // library imports
  import { onMounted, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getDefaultFolders, validateCompendia } from '@/compendia';
  import { SettingKey, moduleSettings } from '@/settings/ModuleSettings';
  import { getGame } from '@/utils/game';
  import { useMainStore } from '@/applications/stores';

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
  const { currentWorldFolder, rootFolder } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const directoryCollapsed = ref<boolean>(false);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDirectoryWorldSelected = async (worldId: string) => {
    const folder = getGame().folders?.find((f)=>f.uuid===worldId);
    if (!folder)
      throw new Error('Invalid folder id in WorldSelected callaback');
    currentWorldFolder.value = folder;

    await validateCompendia(folder);
  };

 
  const onDirectoryCollapseToggle = () => {
    directoryCollapsed.value = !directoryCollapsed.value;
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    directoryCollapsed.value = moduleSettings.get(SettingKey.startCollapsed) || false;

    const folders = await getDefaultFolders();

    if (folders && folders.rootFolder && folders.worldFolder) {
      rootFolder.value = folders.rootFolder;
      currentWorldFolder.value = folders.worldFolder;
    } else {
      throw new Error('Failed to load or create folder structure');
    }
  });



  // public activateListeners(html: JQuery<HTMLElement>): void {
  //   super.activateListeners(html);

  //   // recent item clicked - open it in current tab
  //   this._partials.WBContent.registerCallback(WBContent.CallbackType.RecentClicked, (uuid: string) => { void (this._partials.WBHeader as WBHeader).openEntry(uuid, { newTab: false }); });

  //   // item name changed - rerender
  //   this._partials.WBContent.registerCallback(WBContent.CallbackType.NameChanged, async (entry: JournalEntry) => { 
  //     // let the header know
  //     await (this._partials.WBHeader as WBHeader).changeEntryName(entry);
  //     await this.render(); 
  //   });



  /*
  _saveScrollPositions(html) {
    super._saveScrollPositions(html);
    if (this.subsheet && this.subsheet.rendered && this.subsheet.options.scrollY && this.subsheet.object.id == this.object.id) {   //only save if we're refreshing the sheet
      const selectors = this.subsheet.options.scrollY || [];

      this._scrollPositions = selectors.reduce((pos, sel) => {
        //const el = $(sel, this.subdocument);
        //if (el.length === 1) pos[sel] = Array.from(el).map(el => el[0].scrollTop);
        const el = $(this.subdocument).find(sel);
        pos[sel] = Array.from(el).map(el => el.scrollTop);
        return pos;
      }, (this._scrollPositions || {}));

      game.user.setFlag("monks-enhanced-journal", `pagestate.${this.object.id}.scrollPositions`, flattenObject(this._scrollPositions));
    }
  }

  saveScrollPos() {
    if (this?.subsheet && this.subsheet.options.scrollY && this.subsheet.object.id == this.object.id) {   //only save if we're refreshing the sheet
      const selectors = this.subsheet.options.scrollY || [];

      let newScrollPositions = selectors.reduce((pos, sel) => {
        const el = $(this.subdocument).find(sel);
        pos[sel] = Array.from(el).map(el => el.scrollTop);
        return pos;
      }, {});

      let oldScrollPosition = flattenObject(game.user.getFlag("monks-enhanced-journal", `pagestate.${this.object.id}.scrollPositions`) || {});

      game.user.setFlag("monks-enhanced-journal", `pagestate.${this.object.id}.scrollPositions`, flattenObject(foundry.utils.mergeObject(oldScrollPosition, newScrollPositions)));
    }
  }

*/

  /*

  async deleteEntity(entityId){
    //an entity has been deleted, what do we do?
    for (let tab of this._tabList) {
      if (tab.entityId?.startsWith(entityId)) {
        tab.entity = await this.findEntity('', tab.text); //I know this will return a blank one, just want to maintain consistency
        tab.text = i18n("MonksEnhancedJournal.NewTab");
        $('.fwb-tab[data-tab-id="${tab.id}"] .tab-content', this.element).html(tab.text);
      }

      //remove it from the history
      tab.history = tab.history.filter(h => h != entityId);

      if (tab.active && this.rendered)
        this.render(true);  //if this entity was being shown on the active tab, then refresh the journal
    }

    this._saveTabs();
  }

  _randomizePerson() {
    //randomize first name, last name, race, gender, profession
    //check first to see if the field needs to be rendomized, or if the fields are filled in
  }

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

  .fwb {
    height: 100%;
    width: 100%;
    margin-top: 0px;
    flex-wrap: nowrap;

    // Sidebar 
    #fwb-directory-sidebar {
      flex: 0 0 250px;
      height: 100%;
      background: var(--mej-sidebar-background);
      border-left: 1px solid var(--mej-header-border-color);
      transition: width 0.5s, flex 0.5s;

      & > section {
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
          left: var(--mej-context-x);
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