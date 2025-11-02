<template>
  <div ref="contentRef" class="fcb-sheet-subtab-container flexrow">
    <div class="fcb-subtab-wrapper">
      <nav class="fcb-sheet-navigation flexrow tabs" data-group="primary">
        <a
          v-for="tab in props.tabs"
          :key="tab.id"
          class="item"
          :data-tab="tab.id"
        >
          {{ tab.label }}
        </a>
        <a
          v-if="props.addTab"
          class="item"
          data-tab="add"
          @click="emit('addTab')"
          :title="props.addTabLabel"
        >
          <div class="fcb-tab-icon">
            <i class="fas fa-plus"></i>
          </div>
        </a>
      </nav>
      <div class="fcb-tab-body flexrow">
        <slot></slot>
      </div>
    </div>
  </div> 
</template>

<script setup lang="ts">
  // library imports
  import { PropType, watch, onMounted, nextTick, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  // local imports
  import { useMainStore } from '@/applications/stores';
  
  // library components

  // local components

  // types
  import { ContentTabDescriptor } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    tabs: {
      type: Array as PropType<ContentTabDescriptor[]>,
      required: true
    },
    defaultTab: {
      type: String,
      required: false,
      default: 'description'
    },
    addTab: {
      type: Boolean,
      required: false,
      default: false
    },
    addTabLabel: {
      type: String,
      required: false,
      default: 'Add Tab'
    }
  })

  ////////////////////////////////
  // emits
  const emit = defineEmits<{
    'addTab': [];
  }>();

  ////////////////////////////////
  // store
  const mainStore = useMainStore();
  const { currentContentTab, currentTab, currentContentId, } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  const tabs = ref<foundry.applications.ux.Tabs>();
  const contentRef = ref<HTMLElement | null>(null);

  ////////////////////////////////
  // computed data

  ////////////////////////////////
  // methods
  const mountTabs = async (): Promise<void> => {
    // have to wait until they render
    await nextTick();

    tabs.value = new foundry.applications.ux.Tabs({ 
      group: 'mainContent', 
      navSelector: '.tabs', 
      contentSelector: '.fcb-tab-body', 
      initial: props.defaultTab, 
      callback: () => {
        // update the store when tab changes
        currentContentTab.value = tabs.value?.active || null;
      }
    });

    if (!tabs.value)
      throw new Error('Unable to attach to tabs in ContentTabstrip.onMounted()');

    if (contentRef.value)
      tabs.value.bind(contentRef.value);
  };

  ////////////////////////////////
  // event handlers


  ////////////////////////////////
  // watchers
  // force a tab change when it changes externally
  watch(currentContentTab, async (newTab: string | null, oldTab: string | null): Promise<void> => {
    if (newTab!==oldTab)
      tabs.value?.activate(newTab || props.defaultTab);
  });

  watch(currentTab, () => {
    if (!currentContentTab.value)
        currentContentTab.value = props.defaultTab;

      tabs.value?.activate(currentContentTab.value); 
  });

  // whenever the current content changes, update the tab
  watch(currentContentId, async (): Promise<void> => {
    if (!currentContentId.value)
      return;

    if (!currentContentTab.value)
      currentContentTab.value = props.defaultTab;

    await mountTabs();
  });

  ////////////////////////////////
  // lifecycle events
  onMounted(async () => {
    await mountTabs();
  });


</script>

<style lang="scss">
  .fcb-sheet-subtab-container {
    flex: 1;
    min-height: 0;
    display: flex;
    padding-bottom: 10px;
  }

  .fcb-subtab-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .fcb-tab-body {
    flex: 1;
    min-height: 0;
  }
</style>