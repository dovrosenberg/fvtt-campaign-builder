<template>
  <li
    :class="'fcb-topic-folder folder entry flexcol ' + (frontFolderNode.expanded ? '' : 'collapsed')"
    :data-arc="props.frontFolderNode.id" 
  >
    <header class="folder-header flexrow">
      <div
        class="noborder"
        style="margin-bottom:0px"
        @contextmenu="onFolderContextMenu"
        @click="onFrontFolderClick"
      >
        <i
          class="fas fa-folder-open fa-fw"
          style="margin-right: 4px;"
          data-testid="campaign-folder-toggle"
        ></i>
        <i :class="'icon fas ' + getTabTypeIcon(WindowTabType.Front)" style="margin-right: 4px;"></i>
        <span data-testid="front-folder">
          <span class="node-name">
            {{ localize('contentFolders.fronts') }}
          </span>
        </span>
      </div>
    </header>

    <!-- These are the sessions -->
    <ul 
      v-if="props.frontFolderNode.expanded"
      class="campaign-contents fcb-directory-tree"
    >
      <CampaignDirectoryFrontNode 
        v-for="node in sortedChildren"
        :key="node.id"
        :front-node="node as DirectoryFrontNode"
        :top="true"
        class="fcb-entry-item" 
        draggable="true"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
  // library imports
  import { ref, PropType, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  
  // local imports
  import { localize } from '@/utils/game';
  import { useCampaignDirectoryStore, useNavigationStore, useMainStore } from '@/applications/stores';
  import { getTabTypeIcon } from '@/utils/misc';

  // library components
  import ContextMenu from '@imengyu/vue3-context-menu';
  
  // local components
  import CampaignDirectoryFrontNode from './CampaignDirectoryFrontNode.vue';
  
  // types
  import { DirectoryFrontFolder, DirectoryFrontNode,  } from '@/classes';
  import { WindowTabType } from '@/types';
  
  ////////////////////////////////
  // props
  const props = defineProps({
    frontFolderNode: {
      type: Object as PropType<DirectoryFrontFolder>,
      required: true,
    },
    campaignId: {
      type: String,
      required: true,
    }
  });

  ////////////////////////////////
  // emits

  ////////////////////////////////
  // store
  const campaignDirectoryStore = useCampaignDirectoryStore();
  const navigationStore = useNavigationStore();
  const mainStore = useMainStore();
  const { isInPlayMode } = storeToRefs(mainStore);

  ////////////////////////////////
  // data
  // we don't just use props node because in toggleWithLoad we want to swap it out without rebuilding
  //   the whole tree
  const currentNode = ref<DirectoryFrontFolder>(props.frontFolderNode);
  
  ////////////////////////////////
  // computed data
  const sortedChildren = computed((): DirectoryFrontNode[] => {
    const children = props.frontFolderNode.loadedChildren;
    return children.sort((a, b) => a.name.localeCompare(b.name));
  });

  ////////////////////////////////
  // methods

  ////////////////////////////////
  // event handlers

  // handle arc dragging
  // TODO - probably need to put drag handlers back in too - see campaign
  // const onDragstart = (event: DragEvent): void => {
  //   event.stopPropagation();

  //   const dragData = {
  //     type: 'fcb-campaign',
  //     campaignId: props.campaignNode.id,
  //     name: props.campaignNode.name
  //   } as CampaignNodeDragData;

  //   event.dataTransfer?.setData('text/plain', JSON.stringify(dragData));
  // };

  // change campaign
  const onFrontFolderClick = async (_event: MouseEvent) => {
    currentNode.value = await campaignDirectoryStore.toggleWithLoad(currentNode.value as DirectoryFrontFolder, !currentNode.value.expanded);
  };

  const onFolderContextMenu = (event: MouseEvent): void => {
    //prevent the browser's default menu
    event.preventDefault();
    event.stopPropagation();

    //show our menu
    ContextMenu.showContextMenu({
      customClass: 'fcb',
      x: event.x,
      y: event.y,
      zIndex: 300,
      items: [
        { 
          icon: getTabTypeIcon(WindowTabType.Front),
          iconFontClass: 'fas',
          disabled: isInPlayMode.value,
          label: localize('contextMenus.campaignFolder.createFront'), 
          onClick: async () => {
            const front = await campaignDirectoryStore.createFront(props.campaignId);

            if (front) {
              await navigationStore.openFront(front.uuid, { newTab: true, activate: true, }); 
            }
          }
        },
      ]
    });
  };


  ////////////////////////////////
  // watchers

  ////////////////////////////////
  // lifecycle events

</script>

<style lang="scss">
</style>