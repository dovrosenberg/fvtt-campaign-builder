<!--
  TabPanel.vue

  Purpose:
    Wraps a single panel's tab bar and content area. Each instance creates its own
    TabPanelState via createTabPanelState() and provides it to descendants.

  Responsibilities:
    - Renders the tab bar (FCBHeaderTab for each tab, plus "+" button and optional split button)
    - Provides panel-scoped TabPanelState via provide/inject
    - Registers/unregisters its panel state with navigationStore on mount/unmount
    - Triggers focusPanel() on click/focusin
    - Loads the initial active tab's content on mount

  Props:
    - panelIndex: number — the index of this panel in the panels array
    - isRightmost: boolean — whether this is the rightmost panel (shows split button)

  Emits: none

  Slots: none

  Dependencies:
    - useNavigationStore, useMainStore (Pinia stores)
    - createTabPanelState, TAB_PANEL_STATE_KEY (composable)
    - FCBHeaderTab (component)
    - ContentTab (component)
-->
<template>
  <div
    class="fcb-tab-panel"
    :class="{ 'fcb-tab-panel--focused': isFocused }"
    @click="onPanelClick"
    @focusin="onPanelFocus"
    @drop="onPanelDrop"
    @dragover="DragDropService.standardDragover"
  >
    <div class="fcb-tab-bar flexrow">
      <div
        class="fcb-tab-row flexrow"
        @drop="onTabBarDrop"
        @dragover="DragDropService.standardDragover"
      >
        <FCBHeaderTab
          v-for="tab in panelTabs"
          :key="tab.id"
          :tab="tab"
          :panel-index="props.panelIndex"
          @close-tab="onCloseTab"
        />

        <div
          class="fcb-tab fcb-add-tab flexrow"
          title="Open new tab"
          @click="onAddTabClick"
        >
          <div class="fcb-tab-icon">
            <i class="fas fa-plus"></i>
          </div>
        </div>
      </div>

      <div
        v-if="isRightmost"
        class="fcb-split-button"
        :class="{ disabled: !canSplit }"
        title="Split to right"
        @click="onSplitClick"
      >
        <i class="fas fa-columns"></i>
      </div>
    </div>

    <div class="fcb-content flexcol editable">
      <ContentTab />
    </div>
  </div>
</template>

<script setup lang="ts">
  // library imports
  import { computed, provide, onMounted, onBeforeUnmount, PropType, } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useNavigationStore, useMainStore } from '@/applications/stores';
  import { createTabPanelState, TAB_PANEL_STATE_KEY } from '@/composables/useTabPanelState';
  import DragDropService from '@/utils/dragDrop';

  // library components

  // local components
  import FCBHeaderTab from '@/components/FCBHeader/FCBHeaderTab.vue';
  import ContentTab from '@/components/ContentTab/ContentTab.vue';

  // types
  import { TabDragData, } from '@/types';
  import type { NodeDragDropData } from '@/types/dragDrop';

  ////////////////////////////////
  // props
  const props = defineProps({
    panelIndex: {
      type: Number as PropType<number>,
      required: true,
    },
    isRightmost: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { tabs, focusedPanelIndex } = storeToRefs(navigationStore);

  ////////////////////////////////
  // data
  const panelState = createTabPanelState();
  provide(TAB_PANEL_STATE_KEY, panelState);

  ////////////////////////////////
  // computed data
  const panelTabs = computed(() => tabs.value[props.panelIndex] || []);
  const isFocused = computed(() => focusedPanelIndex.value === props.panelIndex);

  const canSplit = computed(() => {
    return panelTabs.value.length > 1 && tabs.value.length < useNavigationStore().MAX_PANELS;
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers
  const onPanelClick = () => {
    // Check if this panel still exists (might have been removed if last tab was closed)
    // Note there's an edge case where the panel is removed but panelIndex still less than tabs.length;
    //   in that case, we may end up focusing the "wrong" panel, but it doesn't really matter
    if (props.panelIndex < tabs.value.length && focusedPanelIndex.value !== props.panelIndex)
      navigationStore.focusPanel(props.panelIndex);
  };

  const onPanelFocus = () => {
    if (focusedPanelIndex.value !== props.panelIndex)
      navigationStore.focusPanel(props.panelIndex);
  };

  const onCloseTab = (tabId: string) => {
    void navigationStore.removeTab(tabId, props.panelIndex);
  };

  const onAddTabClick = async () => {
    await navigationStore.openEntry(null, { panelIndex: props.panelIndex });
  };

  const onSplitClick = async () => {
    if (!canSplit.value)
      return;
    await navigationStore.splitToRight();
  };

  // drop handler for the tab bar area (cross-panel drops that land on empty space)
  const onTabBarDrop = async (event: DragEvent) => {
    event.preventDefault();

    const data = DragDropService.getValidatedData(event);
    if (!data) {
      return;
    }

    // Handle tab drops for cross-panel tab reordering
    if (data.type === DragDropService.FCBDragTypes.Tab) {
      const tabData = data as TabDragData;
      // only handle cross-panel drops here (same-panel handled by FCBHeaderTab)
      if (tabData.panelIndex === props.panelIndex)
        return;

      await navigationStore.moveTabToPanel(tabData.tabId, tabData.panelIndex, props.panelIndex);
      return;
    }

    // Check if this is FCB drag data for directory nodes
    const fcbData = 'fcbData' in data ? data.fcbData as NodeDragDropData : undefined;
    if (!fcbData) {
      return;
    }

    // Map drag types to open methods
    const dragTypeToOpenMethod = {
      [DragDropService.FCBDragTypes.Setting]: () => navigationStore.openSetting(fcbData.settingId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Entry]: () => navigationStore.openEntry(fcbData.childId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Campaign]: () => navigationStore.openCampaign(fcbData.campaignId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Arc]: () => navigationStore.openArc(fcbData.arcId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Session]: () => navigationStore.openSession(fcbData.sessionId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Front]: () => navigationStore.openFront(fcbData.frontId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.StoryWeb]: () => navigationStore.openStoryWeb(fcbData.storyWebId, { panelIndex: props.panelIndex, activate: true }),
    };

    const openMethod = dragTypeToOpenMethod[fcbData.type as keyof typeof dragTypeToOpenMethod];
    if (openMethod) {
      await openMethod();
    }
  };

  // drop handler for the entire panel (handles directory node drops)
  const onPanelDrop = async (event: DragEvent) => {
    // Don't handle if another handler already processed this
    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const data = DragDropService.getValidatedData(event);
    if (!data) {
      return;
    }

    // Don't handle tab drops (already handled by onTabBarDrop)
    if (data.type === DragDropService.FCBDragTypes.Tab) {
      return;
    }

    // Check if this is FCB drag data
    const fcbData = 'fcbData' in data ? data.fcbData as NodeDragDropData : undefined;
    if (!fcbData) {
      return;
    }

    // Map drag types to open methods
    const dragTypeToOpenMethod = {
      [DragDropService.FCBDragTypes.Setting]: () => navigationStore.openSetting(fcbData.settingId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Entry]: () => navigationStore.openEntry(fcbData.childId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Campaign]: () => navigationStore.openCampaign(fcbData.campaignId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Arc]: () => navigationStore.openArc(fcbData.arcId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Session]: () => navigationStore.openSession(fcbData.sessionId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.Front]: () => navigationStore.openFront(fcbData.frontId, { panelIndex: props.panelIndex, activate: true }),
      [DragDropService.FCBDragTypes.StoryWeb]: () => navigationStore.openStoryWeb(fcbData.storyWebId, { panelIndex: props.panelIndex, activate: true }),
    };

    const openMethod = dragTypeToOpenMethod[fcbData.type as keyof typeof dragTypeToOpenMethod];
    if (openMethod) {
      await openMethod();
    }
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    navigationStore.registerPanelState(props.panelIndex, panelState);

    // if this is the first panel (index 0), set it as the focused panel in mainStore
    if (props.panelIndex === 0 && focusedPanelIndex.value === 0) {
      mainStore.setFocusedPanel(panelState);
    }

    // if this panel is the focused one, update mainStore
    if (focusedPanelIndex.value === props.panelIndex) {
      mainStore.setFocusedPanel(panelState);
    }

    // load the initial active tab's content
    const activeTab = navigationStore.getActiveTab(true, props.panelIndex);
    if (activeTab)
      await panelState.setNewTab(activeTab);
  });

  onBeforeUnmount(() => {
    navigationStore.unregisterPanelState(props.panelIndex);
  });

</script>

<style lang="scss">
  .fcb-tab-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    min-width: 0;

    // tab bar
    .fcb-tab-bar {
      position: relative;
      transition: padding-right 0.5s;
      padding: 4px 2px 0px 4px;
      flex: 0 0 34px;
      color: var(--fcb-header-tab-color);
      border-bottom: 1px solid var(--fcb-header-border-color);
    }

    .fcb-add-tab {
      flex: 0 0 30px;
      justify-content: center;

      .fcb-tab-icon {
        margin: 0px;
      }
    }

    .fcb-split-button {
      flex: 0 0 auto;
      padding: 4px 6px;
      cursor: pointer;
      font-size: var(--fcb-font-size-large);
      align-self: center;
      opacity: 0.7;
      color: var(--fcb-header-tab-color);  // keep the color even when panel is un-focused

      &:hover:not(.disabled) {
        opacity: 1;
      }

      &.disabled {
        opacity: 0.3;
        cursor: default;
        pointer-events: none;
      }
    }

    .fcb-content {
      flex: 1;
      height: 100%;
      overflow: hidden;
      position: relative;
      width: 100%;
    }

    // non-focused panel styling: muted tab text
    &:not(.fcb-tab-panel--focused) {
      .fcb-tab-bar {
        color: var(--fcb-header-tab-color-disabled, rgba(128, 128, 128, 0.6));
      }
      
      // Keep split button color unchanged in non-focused panels
      .fcb-split-button {
        color: var(--fcb-header-tab-color);
      }
    }
  }
</style>
