<template>
  <div  
    :class="'fwb flexrow ' + (directoryCollapsed ? 'collapsed' : '')"
    @click="onClickApplication"
  >
    <div class="fwb-body flexcol">
      <WBHeader />
      <div class="fwb-content flexcol editable">
        <ContentTab />
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
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  import { getGame } from '@/utils/game';

  // library components

  // local components
  import WBHeader from '@/components/WBHeader/WBHeader.vue';
  import ContentTab from '@/components/ContentTab/ContentTab.vue';
  import Directory from '@/components/Directory/Directory.vue';

  // types
  import { Topic, ValidTopic } from '@/types';
  import { CollapsibleNode, Entry, Campaign } from '@/classes';
  import { WorldFlags, WorldFlagKey } from '@/settings/WorldFlags';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorldFolder, rootFolder, directoryCollapsed } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDirectoryWorldSelected = async (worldId: string) => {
    await mainStore.setNewWorld(worldId);
  };

  // whenever we click on a link inside the application that is a link to a document (these are inserted by TextEditor.enrichHTML)
  //    if it's a document in world builder, open in here instead of the default functionality
  const onClickApplication = (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    // ignore anything that's not an <a> with class 'content-link'
    if (target.tagName!=='A')
      return;

    let found=false;
    for (let i=0; i< target.classList.length; i++) {
      if (target.classList[i]==='fwb-content-link' && target.dataset.uuid) {
        found=true; 
        break;
      }
    }
    if (!found)
      return;

    // cancel any other actions
    event.stopPropagation();
    
    // the only things tagged fwb-content-link are ones for the world we're looking at, so just need to open it
    void navigationStore.openEntry(target.dataset.uuid, { newTab: event.ctrlKey});
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    directoryCollapsed.value = moduleSettings.get(SettingKey.startCollapsed) || false;

    const folders = await getDefaultFolders();

    if (folders && folders.rootFolder && folders.worldFolder) {
      // this will force a refresh of the directory; before we do that make sure all the static variables are setup
      const worldId = folders.worldFolder.uuid;

      const worldCompendium = getGame().packs?.get(WorldFlags.get(worldId, WorldFlagKey.worldCompendium)) || null;

      const topicEntries = WorldFlags.get(worldId, WorldFlagKey.topicEntries);
      const campaignEntries = WorldFlags.get(worldId, WorldFlagKey.campaignEntries);
      const topics = [ Topic.Character, Topic.Event, Topic.Location, Topic.Organization ] as ValidTopic[];
      const topicJournals = {
        [Topic.Character]: null,
        [Topic.Event]: null,
        [Topic.Location]: null,
        [Topic.Organization]: null,
      } as Record<ValidTopic, JournalEntry | null>;
      const campaignJournals = [] as JournalEntry[];

      for (let i=0; i<topics.length; i++) {
        const t = topics[i];

        // we need to load the actual entries - not just the index headers
        topicJournals[t] = await(fromUuid(topicEntries[t])) as JournalEntry | null;

        if (!topicJournals[t])
          throw new Error(`Could not find journal for topic ${t} in world ${worldId}`);
      }

      for (let i=0; i<Object.keys(campaignEntries).length; i++) {
        // we need to load the actual entries - not just the index headers
        const j = await(fromUuid(Object.keys(campaignEntries)[i])) as JournalEntry | null;
        if (j)
          campaignJournals.push(j);
      }

      Entry.currentTopicJournals = topicJournals as Record<ValidTopic, JournalEntry>;
      Entry.worldCompendium = worldCompendium;
      Entry.worldId = worldId;
      Campaign.worldCompendium = worldCompendium;
      Campaign.worldId = worldId;
      CollapsibleNode.currentWorldId = worldId;

      rootFolder.value = folders.rootFolder;
      currentWorldFolder.value = folders.worldFolder;

    } else {
      throw new Error('Failed to load or create folder structure');
    }
  });


</script>

<style lang="scss">
@import "@/components/styles/styles.scss";

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