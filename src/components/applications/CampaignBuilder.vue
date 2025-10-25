<template>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet"> 

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
          <FCBHeader />
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
          <Directory  />
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
  import { getCurrentSetting, } from '@/compendia';
  import { SettingKey, ModuleSettings, moduleId } from '@/settings';
  import { useMainStore, useNavigationStore } from '@/applications/stores';
  import { localize } from '@/utils/game';
  import { updateWindowTitle } from '@/utils/titleUpdater';
  import { theme } from '@/components/styles/primeVue';
  import { notifyWarn } from '@/utils/notifications';
  
  // library components
  import Splitter from 'primevue/splitter';
  import SplitterPanel from 'primevue/splitterpanel';

  // local components
  import FCBHeader from '@/components/FCBHeader/FCBHeader.vue';
  import ContentTab from '@/components/ContentTab/ContentTab.vue';
  import Directory from '@/components/Directory/Directory.vue';
  import TitleBarComponents from '@/components/TitleBarComponents.vue';

  // types
  import { WindowTabType, } from '@/types';
  import { Backend, RootFolder, FCBSetting, } from '@/classes';

  
  ////////////////////////////////
  // props

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const navigationStore = useNavigationStore();
  const { currentSetting, rootFolder, } = storeToRefs(mainStore);
  
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
  // const onDirectorySettingSelected = async (settingId: string) => {
  //   await mainStore.setNewSetting(settingId);
  // };

  const onSidebarToggleClick = async () => { 
    directoryCollapsed.value = !directoryCollapsed.value;

    if (splitterRef.value)
      splitterRef.value?.resetState();
  };

  // whenever we click on a link inside the application that is a link to a document (these are inserted by TextEditor.enrichHTML)
  //    if it's a document in setting builder, open in here instead of the default functionality
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
    
    // the only things tagged fcb-content-link are ones for the setting we're looking at, so just need to open it
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
      case WindowTabType.Setting:
        void navigationStore.openSetting(target.dataset.uuid, { newTab: event.ctrlKey});
        break;
    }  
  };

  ////////////////////////////////
  // watchers
  watch(currentSetting, async (newSetting: FCBSetting | null, oldSetting: FCBSetting | null) => {
    // Update the window title when the setting changes
    updateWindowTitle(newSetting?.name || null);
    
    if (currentSetting.value && newSetting?.uuid!==oldSetting?.uuid) {
      // make sure we have a compendium
      if (!currentSetting.value.compendium)
        throw new Error(`Could not find compendium for setting ${currentSetting.value.uuid} in CampaignBuilder.currentSetting watch`);
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
      const { useMainStore, useNavigationStore, useSettingDirectoryStore, useCampaignDirectoryStore, useRelationshipStore, useCampaignStore, useSessionStore } = module;

      useNavigationStore()._customProperties = new Set();
      useMainStore()._customProperties = new Set();
      useSettingDirectoryStore()._customProperties = new Set();
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

    rootFolder.value = await RootFolder.get();

    if (!rootFolder.value)
        throw new Error(`Couldn't get root folder in CampaignBuilder.onMounted()`);

    const setting = await getCurrentSetting();
    if (!setting) {
      // likely asked to create new one and was canceled - just close the window
      // @ts-ignore
      game.modules.get(moduleId)?.activeWindow?.close();
      return;
    }

    mainStore.setNewSetting(setting.uuid);

    // Wait up to 5 seconds for the backend to finish configuring
    for (let i = 0; i < 50; i++) {
      if (!Backend.inProgress) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check if backend is available and show warning if not
    if (!Backend.available) {
      if (!ModuleSettings.get(SettingKey.hideBackendWarning)) {
        notifyWarn(localize('notifications.backend.rollTablesNotAvailable'));
      }
    } else {
      // this is a convenient time to poll for email
      await Backend.pollForEmail();
    }

    mainStore.refreshCurrentContent();

    // Add the prep/play toggle to the header
    // Use setTimeout to ensure the DOM is fully rendered
    setTimeout(() => {
      createTitleBarComponents();
      // Initialize the window title with the current setting name
      updateWindowTitle(currentSetting.value?.name || null);
    }, 100);
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
    background-color: rgba(0,0,0,.7);
    color: var(--fcb-primary-400);
  }

  .fcb-main-window {  
    min-width: 640px;

    // use an id for these to give them precedence
    &#app-fcb-CampaignBuilder {
      @include style-base-components;

      // Apply scrollbar styles to this element AND all descendants
      &, & * {
        scrollbar-width: thin;
        scrollbar-color: var(--fcb-scrollbar) var(--fcb-scrollbar-thumb);
      }
    }
    
    .window-header {
      // we need it to be higher than the content so search results can cover
      z-index: 2;

      background-color: var(--fcb-primary);

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
      user-select: text;  // enable most text to be able to be highlighted for copy/paste - critical for things like editors that aren't open

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
    background: var(--fcb-main-section-background);
  }

  .fcb-sidebar-toggle-tab {
    position: absolute;
    top: 50%; // Center vertically in the gutter
    transform: translateY(-50%); // Adjust for perfect vertical centering
    left: calc(100% - 12px); // Position on the edge of the left panel
    z-index: 100;
    width: 0.75rem;
    height: 2.5rem;
    background-color: var(--fcb-primary) !important;
    color: var(--fcb-text-on-primary);
    border-color: var(--fcb-button-border);
    border: 1px;
    margin-left: 2px;  // so it doesn't bump up against scrollbars
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-14);

    &:hover {
      background-color: var(--fcb-button-bg-hover);
      border-color: var(--fcb-button-border-hover);
    }
  }

  // we need the resize handle to be visible
  #app-fcb-CampaignBuilder .window-resize-handle {
    z-index:99;
  }
</style>

