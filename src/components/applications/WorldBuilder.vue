<template>
  <div  
    class="wcb"
    @click="onClickApplication"
  >
    <Splitter 
      ref="splitterRef"
      layout="horizontal" 
      :gutter-size="2"
      class="wcb-splitter"
    >
      <SplitterPanel 
        :size="directoryCollapsed ? 99 : 76" 
        :min-size="directoryCollapsed ? 99 : 50" 
        class="wcb-left-panel"
      > 
        <div class="wcb-body flexcol">
          <WBHeader />
          <div class="wcb-content flexcol editable">
            <ContentTab />
          </div>
        </div>
        <div
          class="wcb-sidebar-toggle-tab"
          @click.stop="onSidebarToggleClick"
          :class="{ collapsed: directoryCollapsed }"
          :data-tooltip="directoryCollapsed ? localize('tooltips.expandDirectory') : localize('tooltips.collapseDirectory')"
        >
          <i :class="'fas ' + (directoryCollapsed ? 'fa-caret-left' : 'fa-caret-right')"></i>
      </div>
      </SplitterPanel>
      <SplitterPanel :size="directoryCollapsed ? 1 :24" :min-size="directoryCollapsed ? 1 : 18" class=""> 
        <div id="wcb-directory-sidebar" class="flexcol" :style="{display: directoryCollapsed ? 'none' : ''}">
          <Directory @world-selected="onDirectoryWorldSelected" />
        </div> 
      </SplitterPanel>
    </Splitter>
  </div>
</template> 

<script setup lang="ts">
  // library imports
  import { onMounted, watch, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { getDefaultFolders, } from '@/compendia';
  import { SettingKey, ModuleSettings, } from '@/settings';
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  import { localize } from '@/utils/game';

  // library components
  import Splitter from 'primevue/splitter';
  import SplitterPanel from 'primevue/splitterpanel';

  // local components
  import WBHeader from '@/components/WBHeader/WBHeader.vue';
  import ContentTab from '@/components/ContentTab/ContentTab.vue';
  import Directory from '@/components/Directory/Directory.vue';

  // types
  import { Topics, ValidTopic } from '@/types';
  import { WBWorld, } from '@/classes';
  import { CampaignDoc } from '@/documents';
  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentWorld, rootFolder, } = storeToRefs(mainStore);
  
  ////////////////////////////////
  // data
  // current sidebar collapsed state 
  const directoryCollapsed = ref<boolean>(false);
  const splitterRef = ref<InstanceType<typeof Splitter> | null>();

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onDirectoryWorldSelected = async (worldId: string) => {
    await mainStore.setNewWorld(worldId);
  };

  const onSidebarToggleClick = async () => { 
    directoryCollapsed.value = !directoryCollapsed.value;

    if (splitterRef.value)
      splitterRef.value?.resetState();
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
      if (target.classList[i]==='wcb-content-link' && target.dataset.uuid) {
        found=true; 
        break;
      }
    }
    if (!found)
      return;

    // cancel any other actions
    event.stopPropagation();
    
    // the only things tagged wcb-content-link are ones for the world we're looking at, so just need to open it
    void navigationStore.openEntry(target.dataset.uuid, { newTab: event.ctrlKey});
  };

  ////////////////////////////////
  // watchers
  watch(currentWorld, async (newWorld: WBWorld | null, oldWorld: WBWorld | null) => {
    if (currentWorld.value && currentWorld.value.topicIds && newWorld?.uuid!==oldWorld?.uuid) {
      // this will force a refresh of the directory; before we do that make sure all the static variables are setup
      const worldId = currentWorld.value.uuid;

      const worldCompendium = currentWorld.value.compendium || null;

      if (!worldCompendium)
        throw new Error(`Could not find compendium for world ${worldId} in WorldBuilder.onMounted()`);

      const topicIds = currentWorld.value.topicIds;
      const campaignNames = currentWorld.value.campaignNames;
      const topics = [ Topics.Character, Topics.Event, Topics.Location, Topics.Organization ] as ValidTopic[];
      const topicJournals = {
        [Topics.Character]: null,
        [Topics.Event]: null,
        [Topics.Location]: null,
        [Topics.Organization]: null,
      } as Record<ValidTopic, JournalEntry | null>;
      const campaignJournals = {} as Record<string, CampaignDoc>;

      for (let i=0; i<topics.length; i++) {
        const t = topics[i];

        // we need to load the actual entries - not just the index headers
        topicJournals[t] = (await fromUuid(topicIds[t])) as JournalEntry | null;

        if (!topicJournals[t])
          throw new Error(`Could not find journal for topic ${t} in world ${worldId}`);
      }

      for (const campaignId in campaignNames) {
        // we need to load the actual entries - not just the index headers
        const j = await(fromUuid(campaignId)) as CampaignDoc | null;
        if (j) {
          campaignJournals[j.uuid] = j;
        }
      }
    }
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    directoryCollapsed.value = ModuleSettings.get(SettingKey.startCollapsed) || false;

    const folders = await getDefaultFolders();

    if (!folders || !folders.rootFolder)
        throw new Error(`Couldn't get folders in WorldBuilder.onMounted()`);

    const world = folders.world;
    const worldId = folders.world?.uuid;
    const worldCompendium = folders.world?.compendium || null;

    if (!world || !worldId || !worldCompendium)
        throw new Error(`Could not find world/compendium for world ${worldId} in WorldBuilder.onMounted()`);

    if (world.topicIds) {
      // this will force a refresh of the directory; before we do that make sure all the static variables are setup
      const topics = [ Topics.Character, Topics.Event, Topics.Location, Topics.Organization ] as ValidTopic[];
      const topicJournals = {
        [Topics.Character]: null,
        [Topics.Event]: null,
        [Topics.Location]: null,
        [Topics.Organization]: null,
      } as Record<ValidTopic, JournalEntry | null>;
      const campaignJournals = {} as Record<string, CampaignDoc>;

      for (let i=0; i<topics.length; i++) {
        const t = topics[i];
        
        // we need to load the actual entries - not just the index headers
        topicJournals[t] = (await fromUuid(world.topicIds[t])) as JournalEntry | null;

        if (!topicJournals[t])
          throw new Error(`Could not find journal for topic ${t} in world ${worldId}`);
      }

      for (const campaignId in world.campaignNames) {
        // we need to load the actual entries - not just the index headers
        const j = (await fromUuid(campaignId)) as CampaignDoc | null;
        if (j) {
          campaignJournals[j.uuid] = j;
        }
      }

      rootFolder.value = folders.rootFolder;
      mainStore.setNewWorld(folders.world.uuid);

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
#wcb-launch {
  background-color: rgba(0,0,0,.5);
  color: var(--color-text-light-highlight);
}


.wcb-main-window {  
  min-width: 640px;

  .window-content {
    padding: 0;
  }

  .window-content > div {
    overflow: hidden;
  }

  .wcb {
    height: 100%;
    width: 100%;
    margin-top: 0px;
    flex-wrap: nowrap;
    padding: 0.1rem;

    // Sidebar 
    #wcb-directory-sidebar {
      display: flex;
      flex: 0 0 250px;
      height: 100%;
      overflow: hidden;
      background: var(--wcb-sidebar-background);
      border-left: 1px solid var(--wcb-header-border-color);
      transition: width 0.5s, flex 0.5s;

      & > div {
        display: flex !important;
        height: 100%;
      }
    }

    #wcb-directory .entry-name > i {
      margin-right: 8px;
      margin-left: 4px;
      flex: 0 0 15px;
    }

    .wcb-body {
      height: 100%;
    }
  }

  .wcb-content {
    flex: 1;
    height: 100%;
    overflow: hidden;
    position: relative;
    width: 100%;
  }
  
}

.wcb-splitter {
  height: 100%;
}

.wcb-left-panel {
  position: relative;
  overflow: visible !important;  // make sure the tab shows
}

.wcb-sidebar-toggle-tab {
  position: absolute;
  top: 50%; // Center vertically in the gutter 
  transform: translateY(-50%); // Adjust for perfect vertical centering 
  left: calc(100% - 12px); // Position on the edge of the left panel 
  z-index: 100; 
  width: 12px;
  height: 40px;
  background-color: var(--color-light-5) !important;
  color: white;
  border-color: var(--button-hover-border-color);
  border: 1px;
  border-radius: 4px;
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  font-size: 14px; 

  &:hover {
    background-color: #fda948;
    border-color: var(--color-warm-3);
  }
}
</style>

