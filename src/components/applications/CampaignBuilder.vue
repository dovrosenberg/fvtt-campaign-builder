<template>
  <div  
    class="fcb"
    @click="onClickApplication"
  >
    <Splitter 
      ref="splitterRef"
      layout="horizontal" 
      :gutter-size="2"
      class="fcb-splitter"
    >
      <SplitterPanel 
        :size="directoryCollapsed ? 99 : 76" 
        :min-size="directoryCollapsed ? 99 : 50" 
        class="fcb-left-panel"
      > 
        <div class="fcb-body flexcol">
          <WBHeader />
          <div class="fcb-content flexcol editable">
            <ContentTab />
          </div>
        </div>
        <div
          class="fcb-sidebar-toggle-tab"
          @click.stop="onSidebarToggleClick"
          :class="{ collapsed: directoryCollapsed }"
          :data-tooltip="directoryCollapsed ? localize('tooltips.expandDirectory') : localize('tooltips.collapseDirectory')"
        >
          <i :class="'fas ' + (directoryCollapsed ? 'fa-caret-left' : 'fa-caret-right')"></i>
      </div>
      </SplitterPanel>
      <SplitterPanel :size="directoryCollapsed ? 1 :24" :min-size="directoryCollapsed ? 1 : 18" class=""> 
        <div id="fcb-directory-sidebar" class="flexcol" :style="{display: directoryCollapsed ? 'none' : ''}">
          <Directory @world-selected="onDirectoryWorldSelected" />
        </div> 
      </SplitterPanel>
    </Splitter>
  </div>
</template> 

<script setup lang="ts">
  // library imports
  import { onMounted, watch, ref, createApp, h, } from 'vue';
  import { storeToRefs } from 'pinia';
  import PrimeVue from 'primevue/config';

  // local imports
  import { pinia } from '@/applications/stores';
  import { getDefaultFolders, } from '@/compendia';
  import { SettingKey, ModuleSettings, } from '@/settings';
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { initializeRollTables } from '@/utils/nameGenerators';
  import { updateWindowTitle } from '@/utils/titleUpdater';
  import { theme } from '@/components/styles/primeVue';

  // library components
  import Splitter from 'primevue/splitter';
  import SplitterPanel from 'primevue/splitterpanel';

  // local components
  import WBHeader from '@/components/WBHeader/WBHeader.vue';
  import ContentTab from '@/components/ContentTab/ContentTab.vue';
  import Directory from '@/components/Directory/Directory.vue';
  import TitleBarComponents from '@/components/TitleBarComponents.vue';

  // types
  import { WindowTabType, Topics, ValidTopic } from '@/types';
  import { Backend, WBWorld, } from '@/classes';
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
      if (target.classList[i]==='fcb-content-link' && target.dataset.uuid) {
        found=true; 
        break;
      }
    }
    if (!found)
      return;

    // cancel any other actions
    event.stopPropagation();
    
    // the only things tagged fcb-content-link are ones for the world we're looking at, so just need to open it
    switch (parseInt(target.dataset.linkType ?? '-1')) {
      case WindowTabType.Entry:
        void navigationStore.openEntry(target.dataset.uuid, { newTab: event.ctrlKey});
        break;
      case WindowTabType.Campaign:
        void navigationStore.openCampaign(target.dataset.uuid, { newTab: event.ctrlKey});
        break;
      case WindowTabType.Session:
        void navigationStore.openSession(target.dataset.uuid, { newTab: event.ctrlKey});
        break;
      case WindowTabType.PC:
        void navigationStore.openPC(target.dataset.uuid, { newTab: event.ctrlKey});
        break;
      case WindowTabType.World:
        void navigationStore.openWorld(target.dataset.uuid, { newTab: event.ctrlKey});
        break;
    }  
  };

  ////////////////////////////////
  // watchers
  watch(currentWorld, async (newWorld: WBWorld | null, oldWorld: WBWorld | null) => {
    // Update the window title when the world changes
    updateWindowTitle(newWorld?.name || null);
    
    if (currentWorld.value && currentWorld.value.topicIds && newWorld?.uuid!==oldWorld?.uuid) {
      // this will force a refresh of the directory; before we do that make sure all the static variables are setup
      const worldId = currentWorld.value.uuid;

      const worldCompendium = currentWorld.value.compendium || null;

      if (!worldCompendium)
        throw new Error(`Could not find compendium for world ${worldId} in CampaignBuilder.onMounted()`);

      const topicIds = currentWorld.value.topicIds;
      const campaignNames = currentWorld.value.campaignNames;
      const topics = [ Topics.Character, Topics.Location, Topics.Organization ] as ValidTopic[];
      const topicJournals = {
        [Topics.Character]: null,
        [Topics.Location]: null,
        [Topics.Organization]: null,
      } as Record<ValidTopic, JournalEntry | null>;
      const campaignJournals = {} as Record<string, CampaignDoc>;

      for (let i=0; i<topics.length; i++) {
        const t = topics[i];

        // we need to load the actual entries - not just the index headers
        topicJournals[t] = await fromUuid<JournalEntry>(topicIds[t]);

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
  // methods for prep/play toggle
  const createTitleBarComponents = async () => {
    // Find the application window header
    const appId = 'app-fcb-CampaignBuilder';
    const appElement = document.getElementById(appId);
    if (!appElement) return;

    const headerElement = appElement.querySelector('.window-header');
    if (!headerElement) return;

    // Check if toggle already exists
    if (headerElement.querySelector('#fcb-prep-play-toggle')) return;

    // Create a container for our Vue component
    const toggleContainer = document.createElement('div');
    toggleContainer.id = 'fcb-prep-play-toggle';
    toggleContainer.className = 'header-control fcb-mode-toggle';

    // Insert before the close button
    const closeButton = headerElement.querySelector('[data-action="close"]');
    if (closeButton) {
      headerElement.insertBefore(toggleContainer, closeButton);
    } else {
      headerElement.appendChild(toggleContainer);
    }

    // Create and mount the Vue component
    const app = createApp({
      render() {
        return h(TitleBarComponents, {});
      }
    });

    
    // Use the same plugins as the main app
    app.use(PrimeVue, { theme: theme });
    app.use(pinia);

    // this fixes a vue dev tools bug
    if (import.meta.env.MODE === 'development') {
      // need to set _customProperties on all stores - use dynamic import to avoid the import in production
      const module = await import('@/applications/stores/index.ts');
      const { useMainStore, useNavigationStore, useTopicDirectoryStore, useCampaignDirectoryStore, useRelationshipStore, useCampaignStore, useSessionStore } = module;

      useNavigationStore()._customProperties = new Set();
      useMainStore()._customProperties = new Set();
      useTopicDirectoryStore()._customProperties = new Set();
      useCampaignDirectoryStore()._customProperties = new Set();
      useRelationshipStore()._customProperties = new Set();
      useCampaignStore()._customProperties = new Set();
      useSessionStore()._customProperties = new Set();
    }

    // Mount the component to the container
    app.mount(toggleContainer);
  };

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    directoryCollapsed.value = ModuleSettings.get(SettingKey.startCollapsed) || false;
    
    // Make sure the splitter state is reset to reflect the collapsed state
    if (directoryCollapsed.value && splitterRef.value) {
      setTimeout(() => {
        splitterRef.value?.resetState();
      }, 0);
    }

    const folders = await getDefaultFolders();

    if (!folders || !folders.rootFolder)
        throw new Error(`Couldn't get folders in CampaignBuilder.onMounted()`);

    const world = folders.world;
    const worldId = folders.world?.uuid;
    const worldCompendium = folders.world?.compendium || null;

    if (!world || !worldId || !worldCompendium)
        throw new Error(`Could not find world/compendium for world ${worldId} in CampaignBuilder.onMounted()`);

    if (world.topicIds) {
      // this will force a refresh of the directory; before we do that make sure all the static variables are setup
      const topics = [ Topics.Character, Topics.Location, Topics.Organization ] as ValidTopic[];
      const topicJournals = {
        [Topics.Character]: null,
        [Topics.Location]: null,
        [Topics.Organization]: null,
      } as Record<ValidTopic, JournalEntry | null>;
      const campaignJournals = {} as Record<string, CampaignDoc>;

      for (let i=0; i<topics.length; i++) {
        const t = topics[i];

        // we need to load the actual entries - not just the index headers
        topicJournals[t] = await fromUuid<JournalEntry>(world.topicIds[t]);

        if (!topicJournals[t])
          throw new Error(`Could not find journal for topic ${t} in world ${worldId}`);
      }

      for (const campaignId in world.campaignNames) {
        // we need to load the actual entries - not just the index headers
        const j = await fromUuid<CampaignDoc>(campaignId);
        if (j) {
          campaignJournals[j.uuid] = j;
        }
      }

      rootFolder.value = folders.rootFolder;
      mainStore.setNewWorld(folders.world.uuid);

      // initialize roll tables
      await initializeRollTables();

      // Check if backend is available and show warning if not
      if (!Backend.available) {
        if (!ModuleSettings.get(SettingKey.hideBackendWarning)) {
          ui.notifications?.warn(
            "Backend is not available. Automatic RollTables  will not be refreshed. " +
            "Configure the backend in Advanced Settings to enable AI-generated names that match your world's theme."
          );
        }
      }

      mainStore.refreshCurrentContent();

      // Add the prep/play toggle to the header
      // Use setTimeout to ensure the DOM is fully rendered
      setTimeout(() => {
        createTitleBarComponents();
        // Initialize the window title with the current world name
        updateWindowTitle(currentWorld.value?.name || null);
      }, 100);
    } else {
      throw new Error('Failed to load or create folder structure');
    }
  });


</script>

<style lang="scss">
@import "@/components/styles/styles.scss";

// this is from the Vue handler, but we need it to be a flexbox so the overall app window controls the size the rest
//    of the way down
div[data-application-part="app"]:has(> div.fcb) {
  display: flex;
  flex-direction: column;
  flex: 1;
}

// the launch button in the top right corner
#fcb-launch {
  background-color: rgba(0,0,0,.5);
  color: var(--color-text-light-highlight);
}

.fcb-main-window {  
  min-width: 640px;

  .window-header {
    // we need it to be higher than the content so search results can cover
    z-index: 2;

    overflow: visible;  // for the search drop down
  }

  .window-content {
    padding: 0;
    z-index: 1;
  }

  .window-content > div {
    overflow: hidden;
  }

  .fcb {
    height: 100%;
    width: 100%;
    margin-top: 0px;
    flex-wrap: nowrap;
    padding: 0.1rem;

    // Sidebar 
    #fcb-directory-sidebar {
      display: flex;
      flex: 0 0 250px;
      height: 100%;
      overflow: hidden;
      background: var(--fcb-sidebar-background);
      border-left: 1px solid var(--fcb-header-border-color);
      transition: width 0.5s, flex 0.5s;

      & > div {
        display: flex !important;
        height: 100%;
      }
    }

    #fcb-directory .entry-name > i {
      margin-right: 8px;
      margin-left: 4px;
      flex: 0 0 15px;
    }

    .fcb-body {
      height: 100%;
    }
  }

  .fcb-content {
    flex: 1;
    height: 100%;
    overflow: hidden;
    position: relative;
    width: 100%;
  }
  
}

.fcb-splitter {
  height: 100%;
}

.fcb-left-panel {
  position: relative;
  overflow: visible !important;  // make sure the tab shows
}

.fcb-sidebar-toggle-tab {
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

