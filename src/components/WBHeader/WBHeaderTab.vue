<template>
  <div 
    :class="'wcb-tab flexrow ' + (tab.active ? 'active' : '')" 
    draggable="true"
    :title="tab.header.name" 
    @click="onTabClick"
    @dragstart="onDragStart"
    @drop="onDrop"
    @dragover="onDragover"
  >
    <div 
      v-if="tab.header.icon"
      class="wcb-tab-icon"
    >
      <i :class="'fas ' + tab.header.icon"></i>
    </div>
    <div class="tab-content">
      {{ tab.header.name }}
    </div>
    <div 
      class="close"
      @click="onTabCloseClick"
    >
      <i class="fas fa-times"></i>
    </div>
  </div>
</template> 

<script setup lang="ts">
  // library imports
  import { PropType,  } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useNavigationStore } from '@/applications/stores';
  import { WindowTab } from '@/classes';
  import { getValidatedData } from '@/utils/dragdrop';

  // library components

  // local components

  // types

  ////////////////////////////////
  // props
  const props = defineProps({
    tab: {
      type: Object as PropType<WindowTab>,
      required: true,
    }
  });

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    (e: 'closeTab', tabId: string): void;
  }>();

  ////////////////////////////////
  // store
  const navigationStore = useNavigationStore();
  const { tabs, } = storeToRefs(navigationStore);

  ////////////////////////////////
  // data
  
  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods

  const onTabClick = async () => {
    void navigationStore.activateTab(props.tab.id);
  };

  // listener for the tab close buttons
  const onTabCloseClick = async () => {
    emit('closeTab', props.tab.id);
  };


  ////////////////////////////////
  // event handlers

  // handle a bookmark or tab dragging
  const onDragStart = (event: DragEvent): void => {
    const dragData = { 
      //from: this.object.uuid 
    } as { type: string; tabId?: string};

    dragData.type = 'wcb-tab';   // JournalEntry... may want to consider passing a type that other things can do something with
    dragData.tabId = props.tab.id;

    event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  };

  const onDragover = (event: DragEvent) => {
    event.preventDefault();  
    event.stopPropagation();

    if (event.dataTransfer && !event.dataTransfer?.types.includes('text/plain'))
      event.dataTransfer.dropEffect = 'none';
  }

  const onDrop = async (event: DragEvent) => {
    event.preventDefault();  

    // parse the data 
    let data = getValidatedData(event);
    if (!data)
      return;

    // where are we droping it?
    const target = (event.currentTarget as HTMLElement).closest('.wcb-tab') as HTMLElement;
    if (!target)
      return;

    if (data.tabId === props.tab.id) return; // Don't drop on yourself

    // insert before the drop target
    const tabsValue = tabs.value;
    const from = tabsValue.findIndex(t => t.id === data.tabId);
    const to = tabsValue.findIndex(t => t.id === props.tab.id);
    tabsValue.splice(to, 0, tabsValue.splice(from, 1)[0]);
    tabs.value = tabsValue;

    // activate the moved one (will also save the tabs)
    await navigationStore.activateTab(data.tabId);
  };

  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events


</script>

<style lang="scss">
  .wcb-tab {
    max-width: 150px;
    height: 100%;
    padding: 4px;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    line-height: 20px;
    background: var(--wcb-header-tab-background);
    border: var(--wcb-header-tab-border);
    position: relative;
    font-family: 'Signika', sans-serif;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    flex-wrap: nowrap;
    font-size: var(--font-size-14);

    &.active, .wcb-tab:last-child {
      flex: 0 0 150px;
    }

    .wcb-tab-icon {
      flex: 0 1 0%;
      margin-right: 6px;
    }
    
    .tab-content {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.active {
      font-weight: bold;
      background-color: var(--wcb-header-tab-active);
      outline: none;
    }

    &:hover {
      box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
      background-color: var(--wcb-header-tab-hover);
    }

    .close {
      flex: 0 0 10px;
      opacity: 0.6;
      cursor: pointer;
      justify-content: flex-end;
      align-content: flex-end;
      padding-left: 2px;

      &:hover {
        opacity: 0.8;
      }
    }
  }
</style>